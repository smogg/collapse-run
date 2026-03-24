// Word lists by length — common English words, easy to read and type

const WORDS_1 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const WORDS_2 = [
  'GO', 'UP', 'NO', 'DO', 'IF', 'ON', 'AT', 'TO', 'IT', 'IN',
  'BE', 'WE', 'HE', 'ME', 'SO', 'OR', 'AN', 'AS', 'BY', 'MY',
  'OK', 'HI', 'AX', 'OX', 'ZAP',
];

const WORDS_3 = [
  'RUN', 'GUN', 'HIT', 'ZAP', 'POP', 'JAM', 'CUT', 'DIG', 'FLY',
  'JOB', 'MIX', 'NET', 'RAW', 'SKY', 'TOP', 'WIN', 'ZOO', 'ACE',
  'BAT', 'CAP', 'DOT', 'EEL', 'FOG', 'GEM', 'HOP', 'ICE', 'JAR',
  'KEY', 'LOG', 'MAP', 'NUT', 'OWL', 'PIG', 'RED', 'SUN', 'TAP',
  'VAN', 'WAX', 'YAM', 'AIM', 'BOX', 'COG', 'DEN', 'ELF', 'FIN',
];

const WORDS_4 = [
  'FIRE', 'BOLT', 'JUMP', 'DASH', 'BOOM', 'GLOW', 'FURY', 'HUNT',
  'KILL', 'LAVA', 'MELT', 'NUKE', 'ROCK', 'SLAM', 'TANK', 'WARP',
  'ZERO', 'BLAZE', 'CAGE', 'DROP', 'EDGE', 'FANG', 'GOLD', 'HAZE',
  'IRON', 'JINX', 'KNOT', 'LUCK', 'MAZE', 'NOVA', 'OPAL', 'PEAK',
  'RIFT', 'STAR', 'TIDE', 'VOID', 'WAVE', 'APEX', 'BURN', 'CLAW',
  'DOOM', 'ECHO', 'FLUX', 'GRID', 'HAWK', 'ISLE', 'JADE', 'KING',
];

const WORDS_5 = [
  'FLAME', 'STORM', 'BLITZ', 'CRASH', 'GHOST', 'LASER', 'METAL',
  'POWER', 'RAZOR', 'SHOCK', 'TITAN', 'VENOM', 'BLAST', 'CRUSH',
  'FORCE', 'HAVOC', 'LUNAR', 'ORBIT', 'PULSE', 'REIGN', 'SPIKE',
  'ULTRA', 'VIGOR', 'WRECK', 'XENON', 'ABYSS', 'BRAVE', 'CHAOS',
  'DRIFT', 'EMBER', 'FROST', 'GRIND', 'HYPER', 'IVORY', 'JEWEL',
  'KARMA', 'LIGHT', 'MAGIC', 'NERVE', 'OMEGA', 'PRISM', 'ROYAL',
];

const WORDS_6 = [
  'CANNON', 'BLASTER', 'STRIKE', 'ROCKET', 'PLASMA', 'VORTEX',
  'SHADOW', 'METEOR', 'SNIPER', 'BULLET', 'FUSION', 'IMPACT',
  'TURRET', 'SHIELD', 'BREACH', 'CHARGE', 'DANGER', 'ENGINE',
  'FREEZE', 'GALAXY', 'IGNITE', 'JUNGLE', 'KOBALT', 'LAUNCH',
  'MORTAR', 'NEBULA', 'PULSAR', 'QUARTZ', 'RUBBLE', 'STATIC',
];

const WORDS_7 = [
  'COMMAND', 'DEFENSE', 'EXPLODE', 'FIGHTER', 'GRAVITY', 'HELLFIRE',
  'INFERNO', 'JAVELIN', 'KINGDOM', 'LOCKDOWN', 'MISSILE', 'NUCLEAR',
  'OBLITER', 'PHOENIX', 'QUANTUM', 'REACTOR', 'STEALTH', 'TORPEDO',
  'UNLEASH', 'VOLTAGE', 'WARZONE', 'ARSENAL', 'BAYONET', 'CYCLONE',
];

const WORDS_8 = [
  'ABSOLUTE', 'BLIZZARD', 'COLOSSUS', 'DYNAMITE', 'ERUPTION', 'FIRESTORM',
  'GUARDIAN', 'HARDCORE', 'IRONCLAD', 'JUDGMENT', 'KILOWATT', 'MASSACRE',
  'NITROGEN', 'OUTBREAK', 'POWERFUL', 'RAMPAGE', 'SCORCHED', 'TITANIUM',
];

// Debuff words — menacing, red
export const DEBUFF_WORDS = [
  'TRAP', 'CURSE', 'DOOM', 'POISON', 'PLAGUE', 'GLITCH', 'VIRUS',
  'DECAY', 'DRAIN', 'JINX', 'HEX', 'BANE', 'CHAOS', 'BREAK',
  'FAULT', 'CRASH', 'CORRUPT', 'MALWARE', 'STATIC', 'HAZARD',
];

// Powerup words — shiny, gold
export const POWERUP_WORDS = [
  'POWER', 'BOOST', 'SHIELD', 'HYPER', 'TURBO', 'SURGE', 'BLITZ',
  'MEGA', 'ULTRA', 'SUPER', 'FURY', 'RAGE', 'FLASH', 'RUSH',
  'SPARK', 'FORCE', 'PRIME', 'APEX', 'NOVA', 'BOLT',
];

const WORD_POOLS: string[][] = [
  WORDS_1,
  WORDS_2,
  WORDS_3,
  WORDS_4,
  WORDS_5,
  WORDS_6,
  WORDS_7,
  WORDS_8,
];

export function getRandomWord(minLen: number, maxLen: number): string {
  // Collect all eligible words
  const eligible: string[] = [];
  for (let len = minLen; len <= maxLen && len <= 8; len++) {
    const poolIdx = Math.min(len - 1, WORD_POOLS.length - 1);
    const pool = WORD_POOLS[poolIdx];
    for (const w of pool) {
      if (w.length >= minLen && w.length <= maxLen) {
        eligible.push(w);
      }
    }
  }
  if (eligible.length === 0) return 'ZAP';
  return eligible[Math.floor(Math.random() * eligible.length)];
}

export function getDebuffWord(): string {
  return DEBUFF_WORDS[Math.floor(Math.random() * DEBUFF_WORDS.length)];
}

export function getPowerupWord(): string {
  return POWERUP_WORDS[Math.floor(Math.random() * POWERUP_WORDS.length)];
}
