// ══════════════════════════════════════════════════════════════
// Game audio — loads real sound files from public/sounds/
// ══════════════════════════════════════════════════════════════

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let _muted = false;
let _volume = 0.5;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = _volume;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function getMaster(): GainNode {
  getCtx();
  return masterGain!;
}

export function setVolume(v: number) {
  _volume = Math.max(0, Math.min(1, v));
  if (masterGain) masterGain.gain.value = _muted ? 0 : _volume;
}

export function setMuted(m: boolean) {
  _muted = m;
  if (masterGain) masterGain.gain.value = _muted ? 0 : _volume;
}

export function isMuted(): boolean { return _muted; }
export function getVolume(): number { return _volume; }

// ── Audio buffer cache ─────────────────────────────────────
const bufferCache: Map<string, AudioBuffer> = new Map();
const loadingPromises: Map<string, Promise<AudioBuffer | null>> = new Map();

async function loadSound(path: string): Promise<AudioBuffer | null> {
  const cached = bufferCache.get(path);
  if (cached) return cached;

  const existing = loadingPromises.get(path);
  if (existing) return existing;

  const promise = fetch(path)
    .then(r => r.arrayBuffer())
    .then(data => getCtx().decodeAudioData(data))
    .then(buffer => {
      bufferCache.set(path, buffer);
      return buffer;
    })
    .catch(() => null);

  loadingPromises.set(path, promise);
  return promise;
}

// Play a cached sound with optional volume and playback rate
function playBuffer(buffer: AudioBuffer | null, volume: number = 1, rate: number = 1) {
  if (!buffer || _muted) return;
  const c = getCtx();
  const source = c.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = rate;

  const gain = c.createGain();
  gain.gain.value = volume;

  source.connect(gain);
  gain.connect(getMaster());
  source.start();
}

// Fire-and-forget: load + play (uses cache after first load)
function playSound(path: string, volume: number = 1, rate: number = 1) {
  if (_muted) return;
  const cached = bufferCache.get(path);
  if (cached) {
    playBuffer(cached, volume, rate);
  } else {
    loadSound(path).then(buf => playBuffer(buf, volume, rate));
  }
}

// ── Preload all sounds on first user interaction ───────────
let preloaded = false;
export function preloadSounds() {
  if (preloaded) return;
  preloaded = true;
  const files = [
    'sounds/coin.mp3',
    'sounds/click.mp3',
    'sounds/upgrade.mp3',
    'sounds/build.mp3',
    'sounds/achievement.mp3',
    'sounds/studio.mp3',
    'sounds/event.mp3',
    'sounds/rain.mp3',
    'sounds/thunder.mp3',
  ];
  for (const f of files) loadSound(f);
}

// ── Public sound functions ─────────────────────────────────

// Cash/coin sound — pitch increases with income level (0-1)
export function playCashSound(incomeLevel: number = 0) {
  const rate = 0.8 + incomeLevel * 0.6; // 0.8x to 1.4x speed
  playSound('sounds/coin.mp3', 0.3, rate);
}

// Generic button click
export function playClickSound() {
  playSound('sounds/click.mp3', 0.5);
}

// Floor amenity purchased
export function playUpgradeSound() {
  playSound('sounds/upgrade.mp3', 0.5);
}

// New floor built (big purchase)
export function playNewFloorSound() {
  playSound('sounds/build.mp3', 0.6);
}

// Achievement or penthouse conversion
export function playAchievementSound() {
  playSound('sounds/achievement.mp3', 0.6);
}

// Studio conversion
export function playStudioSound() {
  playSound('sounds/studio.mp3', 0.5);
}

// City event starts
export function playEventSound() {
  playSound('sounds/event.mp3', 0.5);
}

// Thunder crack (during rain lightning)
export function playThunderSound() {
  playSound('sounds/thunder.mp3', 0.5);
}

// Tenant arrives (skipped for now — no file)
export function playTenantSound() {
  // No-op until we add a tenant sound file
}

// ── Rain ambience (looping) ────────────────────────────────
let rainSource: AudioBufferSourceNode | null = null;
let rainGain: GainNode | null = null;

export async function startRainAmbience() {
  if (_muted || rainSource) return;
  const buffer = await loadSound('sounds/rain.mp3');
  if (!buffer || rainSource) return; // check again after async

  const c = getCtx();
  rainSource = c.createBufferSource();
  rainSource.buffer = buffer;
  rainSource.loop = true;

  rainGain = c.createGain();
  rainGain.gain.setValueAtTime(0, c.currentTime);
  rainGain.gain.linearRampToValueAtTime(0.15, c.currentTime + 2);

  rainSource.connect(rainGain);
  rainGain.connect(getMaster());
  rainSource.start();
}

export function stopRainAmbience() {
  if (rainSource && rainGain) {
    const c = getCtx();
    rainGain.gain.linearRampToValueAtTime(0, c.currentTime + 1.5);
    const src = rainSource;
    setTimeout(() => { try { src.stop(); } catch {} }, 1600);
    rainSource = null;
    rainGain = null;
  }
}
