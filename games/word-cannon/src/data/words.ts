// Word lists by length — common English words, easy to read and type

const WORDS_1 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const WORDS_2 = [
  'GO', 'UP', 'NO', 'DO', 'IF', 'ON', 'AT', 'TO', 'IT', 'IN',
  'BE', 'WE', 'HE', 'ME', 'SO', 'OR', 'AN', 'AS', 'BY', 'MY',
  'OK', 'HI', 'AX', 'OX', 'US',
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
  'ZERO', 'CAGE', 'DROP', 'EDGE', 'FANG', 'GOLD', 'HAZE', 'IRON',
  'JINX', 'KNOT', 'LUCK', 'MAZE', 'NOVA', 'OPAL', 'PEAK', 'RIFT',
  'STAR', 'TIDE', 'VOID', 'WAVE', 'APEX', 'BURN', 'CLAW', 'DOOM',
  'ECHO', 'FLUX', 'GRID', 'HAWK', 'ISLE', 'JADE', 'KING', 'LAMP',
  'MINT', 'NEST', 'OATH', 'PLUM', 'QUIZ', 'RAMP', 'SAGE', 'TUSK',
  'UNIT', 'VEIL', 'WHIP', 'YARN', 'ZINC', 'ARCH', 'BEAD', 'COAL',
  'DUSK', 'FERN', 'GRIT', 'HELM', 'INCH', 'JOLT', 'KITE', 'LOOM',
  'MOTH', 'NAIL', 'ORCA', 'PAWN', 'RAIL', 'SLAB', 'TWIG', 'VINE',
  'WREN', 'YOKE', 'ZEST', 'BRIM', 'COIL', 'DUNE', 'FOAM', 'GUST',
  'HUSK', 'IRIS', 'KNOB', 'LURE', 'MUSK', 'NODE', 'PLOY', 'REED',
  'SOOT', 'TOIL', 'VENT', 'WILT', 'YAWN', 'BARK', 'COVE', 'DART',
  'FLAW', 'GLEN', 'HARP', 'LACE', 'MONK', 'PELT', 'ROBE', 'SILK',
  'THAW', 'VALE', 'WISP', 'GULF', 'JAWS', 'LIMP', 'OATH', 'RUST',
  'SWAY', 'TURF', 'WELD', 'FIZZ', 'CUFF', 'DRAB', 'FEAT', 'GAZE',
  'HULK', 'IBEX', 'JEER', 'KELP', 'LOFT', 'MUTT', 'PANG', 'RINK',
  'SNAG', 'TANG', 'WASP', 'YELL', 'BUFF', 'CHOP', 'DEFT', 'FLAP',
  'GLOB', 'HYMN', 'JEST', 'KEEN', 'LISP', 'MEND', 'PAVE', 'RUNE',
  'SWAB', 'TREK', 'WAND', 'BLOT', 'CURB', 'DENT', 'FUME', 'GASH',
];

const WORDS_5 = [
  'FLAME', 'STORM', 'BLITZ', 'CRASH', 'GHOST', 'LASER', 'METAL',
  'POWER', 'RAZOR', 'SHOCK', 'TITAN', 'VENOM', 'BLAST', 'CRUSH',
  'FORCE', 'HAVOC', 'LUNAR', 'ORBIT', 'PULSE', 'REIGN', 'SPIKE',
  'ULTRA', 'VIGOR', 'WRECK', 'XENON', 'ABYSS', 'BRAVE', 'CHAOS',
  'DRIFT', 'EMBER', 'FROST', 'GRIND', 'HYPER', 'IVORY', 'JEWEL',
  'KARMA', 'LIGHT', 'MAGIC', 'NERVE', 'OMEGA', 'PRISM', 'ROYAL',
  'AISLE', 'BADGE', 'CEDAR', 'DELTA', 'EAGLE', 'FLAIR', 'GRAIN',
  'HASTE', 'INDEX', 'JOUST', 'KNEEL', 'LEVER', 'MANOR', 'NOBLE',
  'OZONE', 'PLANK', 'QUEST', 'RISEN', 'SLEEK', 'TOWER', 'USHER',
  'VALVE', 'WHALE', 'YIELD', 'ZEBRA', 'BLUNT', 'CRANE', 'DECOY',
  'FLINT', 'GLOBE', 'HEIST', 'IRONY', 'JUDGE', 'LODGE', 'MIRTH',
  'ONION', 'PANEL', 'REIGN', 'SIEGE', 'TRUCE', 'VAULT', 'WRATH',
  'AGILE', 'BRISK', 'CIDER', 'DRONE', 'ERUPT', 'FIEND', 'GLYPH',
  'HOUND', 'INGOT', 'LATCH', 'MARSH', 'NOTCH', 'PLUME', 'RIDGE',
  'SWIFT', 'TORCH', 'VIVID', 'WITCH', 'ALLOY', 'BRINE', 'CHUNK',
  'DEPTH', 'EXILE', 'FORGE', 'GLEAM', 'HAUNT', 'KNACK', 'MOOSE',
  'PERIL', 'QUAKE', 'SHALE', 'THORN', 'VERGE', 'AXIOM', 'BASIN',
  'CRISP', 'ELBOW', 'FLASK', 'GRASP', 'HITCH', 'LUCID', 'NYMPH',
];

const WORDS_6 = [
  'CANNON', 'STRIKE', 'ROCKET', 'PLASMA', 'VORTEX', 'SHADOW',
  'METEOR', 'SNIPER', 'BULLET', 'FUSION', 'IMPACT', 'TURRET',
  'SHIELD', 'BREACH', 'CHARGE', 'DANGER', 'ENGINE', 'FREEZE',
  'GALAXY', 'IGNITE', 'JUNGLE', 'KOBALT', 'LAUNCH', 'MORTAR',
  'NEBULA', 'PULSAR', 'QUARTZ', 'RUBBLE', 'STATIC', 'ANCHOR',
  'BANDIT', 'CARBON', 'DAGGER', 'FALCON', 'GADGET', 'HELMET',
  'INSECT', 'JACKAL', 'KITTEN', 'LIZARD', 'MAGNET', 'NECTAR',
  'OUTLAW', 'PARROT', 'QUIVER', 'RAPTOR', 'SIGNAL', 'TEMPLE',
  'UNLOCK', 'WILDER', 'WALRUS', 'ZIPPER', 'ARCTIC', 'BLAZER',
  'COBALT', 'DRAGON', 'EMPIRE', 'FLURRY', 'GRAVEL', 'HARBOR',
  'IGUANA', 'JIGSAW', 'LAGOON', 'MIRROR', 'ORCHID', 'PIRATE',
  'RIBBON', 'SUMMIT', 'TURNIP', 'UPWIND', 'VELVET', 'WRAITH',
  'BARLEY', 'CIPHER', 'DAMSEL', 'FOSSIL', 'GOBLIN', 'HERMIT',
  'ICICLE', 'LEGEND', 'MYSTIC', 'OSPREY', 'PEBBLE', 'RIDDLE',
  'SCARAB', 'THRONE', 'VIKING', 'ZENITH', 'BLIGHT', 'CLOVER',
  'DONKEY', 'FERRET', 'GOPHER', 'HUNTER', 'INDENT', 'JESTER',
  'LIMPET', 'MONKEY', 'OYSTER', 'PLUNGE', 'RODENT', 'SPLICE',
  'TUNDRA', 'WALNUT', 'BALLOT', 'CRISIS', 'FATHOM', 'GROOVE',
];

const WORDS_7 = [
  'COMMAND', 'DEFENSE', 'EXPLODE', 'FIGHTER', 'GRAVITY', 'INFERNO',
  'JAVELIN', 'KINGDOM', 'MISSILE', 'NUCLEAR', 'PHOENIX', 'QUANTUM',
  'REACTOR', 'STEALTH', 'TORPEDO', 'UNLEASH', 'VOLTAGE', 'WARZONE',
  'ARSENAL', 'BAYONET', 'CYCLONE', 'AMAZING', 'BALANCE', 'CAPTAIN',
  'DIAMOND', 'ECLIPSE', 'FURNACE', 'GLACIER', 'HORIZON', 'IMPULSE',
  'JOURNEY', 'KUNZITE', 'LANTERN', 'MAMMOTH', 'NETWORK', 'OPTIMUM',
  'PANTHER', 'QUARREL', 'RAMPART', 'SERPENT', 'TRIUMPH', 'UPDRAFT',
  'VOLCANO', 'WHISPER', 'ALCHEMY', 'BOULDER', 'CHARIOT', 'DRIZZLE',
  'EMBASSY', 'FLANNEL', 'GONDOLA', 'HARVEST', 'ICEBERG', 'JACUZZI',
  'KETCHUP', 'LEOPARD', 'MUSTARD', 'NARWHAL', 'ORIGAMI', 'PILGRIM',
  'QUARREL', 'RATCHET', 'SAFFRON', 'TYPHOON', 'UNICORN', 'VERDICT',
  'WARTHOG', 'ZEALOUS', 'BASTION', 'CLUSTER', 'DUNGEON', 'ENTROPY',
  'FRANTIC', 'GRYPHON', 'HARPOON', 'ISOTOPE', 'JOGGLER', 'LATTICE',
  'MAMMOTH', 'NEUTRON', 'OUTPOST', 'PLUNDER', 'QUARREL', 'REBUILD',
  'SOLDIER', 'TANGENT', 'VAGRANT', 'WRANGLE',
];

const WORDS_8 = [
  'ABSOLUTE', 'BLIZZARD', 'COLOSSUS', 'DYNAMITE', 'ERUPTION', 'FUGITIVE',
  'GUARDIAN', 'HARDCORE', 'IRONCLAD', 'JUDGMENT', 'KILOWATT', 'MASSACRE',
  'NITROGEN', 'OUTBREAK', 'POWERFUL', 'RIPTIDES', 'SCORCHED', 'TITANIUM',
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
  'SPARK', 'FORCE', 'PRIME', 'APEX', 'NOVA', 'BOLT', 'HEAL',
  'MEND', 'CURE', 'RENEW', 'VIGOR',
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
