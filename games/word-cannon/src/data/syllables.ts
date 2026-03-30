import { FragmentConfig } from '../types';

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U', 'Y']);

/**
 * Split a word into fragments for tap mode.
 * Syllable-aware: tries to split at consonant-vowel boundaries.
 * Configurable chunk sizes for tuning difficulty.
 */
export function splitWord(word: string, config: FragmentConfig): string[] {
  if (word.length <= config.minSize) return [word];

  if (!config.syllableAware) {
    return fixedSplit(word, config);
  }

  return syllableSplit(word, config);
}

function fixedSplit(word: string, config: FragmentConfig): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < word.length) {
    const remaining = word.length - i;
    let size = config.preferSize;
    // Don't leave a remainder smaller than minSize
    if (remaining - size < config.minSize && remaining > size) {
      size = remaining;
    }
    size = Math.min(size, remaining, config.maxSize);
    chunks.push(word.slice(i, i + size));
    i += size;
  }
  return chunks;
}

function syllableSplit(word: string, config: FragmentConfig): string[] {
  // Find candidate split points (consonant→vowel transitions)
  const splitPoints: number[] = [];
  for (let i = 1; i < word.length; i++) {
    const prev = VOWELS.has(word[i - 1]);
    const curr = VOWELS.has(word[i]);
    // Split before a consonant that follows a vowel (VC|C pattern)
    // or before a vowel that follows a consonant (CV boundary)
    if (!prev && curr && i > 1) {
      // consonant-vowel: split before consonant (one back)
      splitPoints.push(i - 1);
    } else if (prev && !curr && i < word.length - 1) {
      // vowel-consonant: split after vowel
      splitPoints.push(i);
    }
  }

  // Deduplicate and sort
  const unique = [...new Set(splitPoints)].sort((a, b) => a - b);

  // Build chunks using split points, respecting size constraints
  const chunks: string[] = [];
  let start = 0;

  for (const sp of unique) {
    if (sp - start < config.minSize) continue;
    if (sp - start > config.maxSize) {
      // Force a split within this large chunk
      while (sp - start > config.maxSize) {
        const end = Math.min(start + config.preferSize, word.length);
        chunks.push(word.slice(start, end));
        start = end;
      }
      if (sp > start && sp - start >= config.minSize) {
        chunks.push(word.slice(start, sp));
        start = sp;
      }
      continue;
    }
    chunks.push(word.slice(start, sp));
    start = sp;
  }

  // Remaining
  if (start < word.length) {
    const remainder = word.slice(start);
    if (chunks.length > 0 && remainder.length < config.minSize) {
      // Merge tiny remainder into last chunk if it won't exceed max
      const last = chunks[chunks.length - 1];
      if (last.length + remainder.length <= config.maxSize) {
        chunks[chunks.length - 1] = last + remainder;
      } else {
        chunks.push(remainder);
      }
    } else {
      chunks.push(remainder);
    }
  }

  // Validate: if we ended up with bad chunks, fall back to fixed split
  if (chunks.length === 0 || chunks.some(c => c.length === 0)) {
    return fixedSplit(word, config);
  }

  return chunks;
}
