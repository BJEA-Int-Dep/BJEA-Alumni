import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildSuggestions,
  compatibleEmojis,
  normalizeEmoji,
  randomPair,
  upstreamImage,
} from '../server/kitchen.ts';
import {
  canChooseEmoji,
  chooseAnyEmoji,
  compatibilityReady,
  emptyAvatar,
  mergeSuggestions,
  pairImagePath,
  selectedPair,
  suggestionRequestSchema,
  type Suggestions,
} from '../shared/avatar.ts';

const entries = (...emojis: string[]) =>
  emojis.map((emoji) => ({ emoji, reason: `关于 ${emoji}` }));
const suggestions: Suggestions = {
  recommendations: entries('🐱', '🐶', '🦊', '🌟'),
  nicknameSuggestions: ['小行星', '周五下班', '十一号'],
};

test('uses real bidirectional Kitchen lookup and rejects invalid inputs', () => {
  assert.ok(upstreamImage('🐱', '🔥'));
  assert.ok(upstreamImage('🔥', '🐱'));
  assert.equal(upstreamImage('🐱', 'https://example.com'), null);
  assert.equal(upstreamImage('not-an-emoji', '🔥'), null);
  assert.equal(normalizeEmoji('🌪️'), '🌪');
  assert.equal(normalizeEmoji('🐱🐶'), null);
});

test('cleans and deduplicates recommendations without requiring combinations', () => {
  const result = buildSuggestions({
    recommendations: entries('🐱', '🐱', 'not-an-emoji', '🦊'),
    nicknameSuggestions: ['小行星', '周五下班', '十一号'],
  });
  assert.deepEqual(
    result.recommendations.map((entry) => entry.emoji),
    ['🐱', '🦊'],
  );
  assert.deepEqual(result.nicknameSuggestions, suggestions.nicknameSuggestions);
});

test('AI merge updates recommendations only and preserves manual selection', () => {
  let state = chooseAnyEmoji(emptyAvatar(), 'first', '🐶', new Set());
  state = mergeSuggestions(state, suggestions);
  assert.deepEqual(state.selection, { first: '🐶', second: '' });
  assert.deepEqual(state.nicknameSuggestions, suggestions.nicknameSuggestions);
  assert.deepEqual(
    state.recommendations.map((entry) => entry.emoji),
    ['🐱', '🐶', '🦊', '🌟'],
  );
});

test('manual picker choices accept compatible emoji and reject incompatible data', () => {
  let state = chooseAnyEmoji(emptyAvatar(), 'first', '🐱', new Set());
  assert.equal(canChooseEmoji(state, 'second', '🔥', new Set(['🔥'])), true);
  state = chooseAnyEmoji(state, 'second', '🔥', new Set(['🔥']));
  assert.deepEqual(state.selection, { first: '🐱', second: '🔥' });
  assert.deepEqual(selectedPair(state), {
    first: '🐱',
    second: '🔥',
    imageUrl: pairImagePath('🐱', '🔥'),
  });
  assert.equal(chooseAnyEmoji(state, 'second', '🦄', new Set(['🔥'])), state);
});

test('compatibility data mirrors image lookup and random choices are valid', () => {
  const compatible = compatibleEmojis('🐱');
  assert.ok(compatible.includes('🔥'));
  assert.ok(compatible.every((emoji) => upstreamImage('🐱', emoji)));
  const pair = randomPair();
  assert.ok(pair);
  assert.ok(upstreamImage(pair.first, pair.second));
});

test('compatibility is unavailable until the current request succeeds', () => {
  assert.equal(compatibilityReady('🐱', '🐱', true), false);
  assert.equal(compatibilityReady('🐱', '', false), false);
  assert.equal(compatibilityReady('🐱', '🐱', false), true);
  assert.equal(compatibilityReady('', '', false), true);
});

test('request validation accepts only answers and refresh', () => {
  const input = {
    answers: { personality: '', nickname: '', year: '2024' },
    refresh: 0,
  };
  assert.ok(suggestionRequestSchema.safeParse(input).success);
  assert.equal(
    suggestionRequestSchema.safeParse({ ...input, stage: 3 }).success,
    false,
  );
  assert.equal(
    suggestionRequestSchema.safeParse({ ...input, refresh: 1000001 }).success,
    false,
  );
  assert.equal(
    suggestionRequestSchema.safeParse({
      ...input,
      answers: { ...input.answers, reflection: 'x'.repeat(501) },
    }).success,
    false,
  );
});
