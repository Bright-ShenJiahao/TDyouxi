/* =====================================================================
 * 音效与背景音乐：全部用 WebAudio 实时合成，不引用任何外部音频文件
 * 入口：initAudio()（首次点击时初始化）、sfx(name)、toggleMute() / setMuted()
 * 背景音乐：68 BPM，D 羽调五声音阶（D F G A C），木鱼 + 锣 + 低音持续音
 * ===================================================================== */
let AC = null, MASTER = null, SFXG = null, MUSG = null, NOISE = null;
let AUDIO_MUTED = false, BGM_TIMER = null, BGM_NEXT = 0, BGM_STEP = 0;
const LAST_SFX = {};
const SFX_GAP = 0.05;          // 同一种音效 0.05 秒内只播一次，避免群死爆音
const BGM_BEAT = 60 / 68;      // 一拍时长

// ---------- 初始化 ----------
function noiseBuf() {
  if (NOISE) return NOISE;
  const n = Math.floor(AC.sampleRate * 0.6);
  NOISE = AC.createBuffer(1, n, AC.sampleRate);
  const d = NOISE.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return NOISE;
}

function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return;
  AC = new C();
  MASTER = AC.createGain(); MASTER.gain.value = AUDIO_MUTED ? 0 : 0.9;
  MASTER.connect(AC.destination);
  SFXG = AC.createGain(); SFXG.gain.value = 0.8; SFXG.connect(MASTER);
  MUSG = AC.createGain(); MUSG.gain.value = 0.3; MUSG.connect(MASTER);
  if (AC.state === 'suspended') AC.resume();
  startBgm();
}

// 浏览器要求先有用户手势才能出声：第一次点击 / 触摸 / 按键时初始化
(function () {
  const unlock = () => initAudio();
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('touchstart', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
})();

// ---------- 基础合成 ----------
function tone(t, freq, dur, type, gain, to, dest, attack) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  const a = attack || 0.006;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || SFXG);
  o.start(t); o.stop(t + dur + 0.05);
}

function noise(t, dur, ftype, freq, q, gain, to, dest) {
  const s = AC.createBufferSource(); s.buffer = noiseBuf();
  const f = AC.createBiquadFilter();
  f.type = ftype || 'bandpass'; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 1;
  if (to) f.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(dest || SFXG);
  s.start(t); s.stop(t + dur + 0.05);
}

// ---------- 音效表 ----------
const SFX = {
  fu(t) {                       // 掷符：轻快「嗖」
    noise(t, 0.16, 'bandpass', 900, 1.4, 0.22, 3200);
    tone(t, 660, 0.12, 'triangle', 0.07, 1500);
  },
  lei(t) {                      // 雷击：电流噼啪
    noise(t, 0.05, 'highpass', 2800, 0.8, 0.32);
    noise(t + 0.05, 0.05, 'highpass', 4200, 0.8, 0.24);
    noise(t + 0.1, 0.1, 'bandpass', 1600, 0.9, 0.2);
    tone(t, 140, 0.16, 'square', 0.1, 60);
  },
  boom(t) {                     // 炮弹爆炸：低沉「砰」
    tone(t, 120, 0.42, 'sine', 0.5, 36);
    tone(t, 70, 0.5, 'triangle', 0.18, 30);
    noise(t, 0.34, 'lowpass', 1000, 0.9, 0.4, 120);
  },
  net(t) {                      // 符网张开
    noise(t, 0.24, 'bandpass', 2800, 2.4, 0.2, 900);
    tone(t, 880, 0.14, 'sine', 0.05);
    tone(t + 0.045, 1174.7, 0.14, 'sine', 0.045);
  },
  die(t) {                      // 怪物死亡
    tone(t, 320, 0.13, 'square', 0.1, 90);
    noise(t, 0.09, 'lowpass', 900, 1, 0.12);
  },
  build(t) {                    // 建塔
    tone(t, 190, 0.16, 'sine', 0.36, 70);
    tone(t + 0.02, 95, 0.2, 'triangle', 0.18, 45);
    noise(t, 0.04, 'bandpass', 2600, 3, 0.16);
  },
  up(t) {                       // 升级
    [587.33, 698.46, 880].forEach((f, i) => tone(t + i * 0.06, f, 0.18, 'triangle', 0.1, f * 1.01));
  },
  leak(t) {                     // 漏怪：低沉警示
    tone(t, 110, 0.55, 'sawtooth', 0.12, 54);
    tone(t + 0.22, 82, 0.5, 'sine', 0.16, 41);
  },
  card(t) {                     // 选卡
    tone(t, 880, 0.16, 'triangle', 0.12, 1174.66);
    tone(t + 0.04, 1174.66, 0.16, 'sine', 0.07);
  },
  wave(t) {                     // 新一波：锣
    [98, 147, 196, 262, 349, 466].forEach((f, i) => tone(t, f, 2.4 - i * 0.2, 'sine', 0.16 / (i + 1), null, null, 0.01));
    noise(t, 0.5, 'bandpass', 4000, 0.7, 0.05, 2400);
  },
  boss(t) {                     // 尸王出现：鼓
    tone(t, 95, 0.5, 'sine', 0.55, 42);
    noise(t, 0.06, 'lowpass', 600, 1, 0.35);
    tone(t + 0.22, 82, 0.45, 'sine', 0.3, 36);
  },
  win(t) {                      // 胜利
    [293.66, 349.23, 392, 440, 587.33].forEach((f, i) => tone(t + i * 0.13, f, 0.34, 'triangle', 0.12));
    tone(t + 0.66, 1174.66, 0.7, 'sine', 0.08);
  },
  lose(t) {                     // 失败
    [220, 196, 174.61, 146.83].forEach((f, i) => tone(t + i * 0.26, f, 0.5, 'triangle', 0.13));
    tone(t + 0.1, 73.42, 1.6, 'sine', 0.1, 55, null, 0.2);
  },
};

function sfx(name) {
  if (!AC || AUDIO_MUTED || AC.state !== 'running') return;
  const t = AC.currentTime;
  if (LAST_SFX[name] != null && t - LAST_SFX[name] < SFX_GAP) return;
  LAST_SFX[name] = t;
  const f = SFX[name];
  if (f) f(t + 0.005);
}

// ---------- 静音 ----------
function setMuted(on) {
  AUDIO_MUTED = !!on;
  if (MASTER) {
    const t = AC.currentTime;
    MASTER.gain.cancelScheduledValues(t);
    MASTER.gain.setTargetAtTime(AUDIO_MUTED ? 0 : 0.9, t, 0.02);
  }
  return AUDIO_MUTED;
}
function toggleMute() { return setMuted(!AUDIO_MUTED); }

// ---------- 背景音乐 ----------
// D 羽调五声：D F G A C（低八度做持续音，高八度做稀疏旋律）
const PENTA = [293.66, 349.23, 392, 440, 523.25];

function startBgm() {
  if (BGM_TIMER) return;
  BGM_NEXT = AC.currentTime + 0.15;
  BGM_STEP = 0;
  BGM_TIMER = setInterval(bgmTick, 90);
}

function bgmTick() {
  if (!AC) return;
  const now = AC.currentTime;
  if (BGM_NEXT < now) BGM_NEXT = now + 0.05;   // 切后台回来时不补播一大串
  while (BGM_NEXT < now + 0.4) { bgmBeat(BGM_STEP, BGM_NEXT); BGM_STEP++; BGM_NEXT += BGM_BEAT; }
}

function bgmBeat(i, t) {
  const b = i % 16;                            // 4 小节 × 4 拍循环
  // 低音持续音：每小节第一拍，慢起慢落
  if (b % 4 === 0) {
    tone(t, 73.42, 3.4, 'sine', 0.08, null, MUSG, 0.5);
    tone(t, 110, 3.2, 'triangle', 0.03, null, MUSG, 0.6);
  }
  // 木鱼：每两拍一下（反拍），轻
  if (b % 2 === 1) {
    noise(t, 0.03, 'bandpass', 2200, 4, 0.12, null, MUSG);
    tone(t, 1050, 0.03, 'sine', 0.05, null, MUSG);
  }
  // 锣：每两小节一次，留长尾
  if (b === 0 && (i / 16) % 2 === 0) {
    [98, 147, 196, 262].forEach((f, k) => tone(t, f, 2.8 - k * 0.4, 'sine', 0.08 / (k + 1), null, MUSG, 0.02));
  }
  // 稀疏旋律：每小节 1～2 个音，大量留白
  if (b === 6 || b === 10 || b === 14) {
    const n = PENTA[(i * 3 + b) % PENTA.length] / 2;
    tone(t, n, 1.6, 'triangle', 0.07, n * 0.99, MUSG, 0.04);
  }
}
