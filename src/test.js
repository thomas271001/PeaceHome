/* Scoring checks for the Community Screening form. Run: node src/test.js */
const assert = require('assert');
const { scoreScreening, DEFAULT_CONFIG, validAge } = require('./scoring.js');
const { PART_I, PART_II } = require('./criteria.js');
let n = 0;
function t(name, fn) { fn(); n++; console.log('ok  ' + name); }
const A = (o) => Object.assign({ age: 30 }, o || {});

t('no items and age under 40 is not eligible, score 0', () => {
  const r = scoreScreening(A()); assert.strictEqual(r.eligible, false); assert.strictEqual(r.score, 0);
});
['i1', 'i2', 'i3', 'i4', 'i5','i6'].forEach((id) => t('Part I item ' + id + ' alone makes a person eligible', () => {
  const r = scoreScreening(A({ [id]: true })); assert.strictEqual(r.eligible, true); assert.strictEqual(r.part1Any, true); assert.strictEqual(r.score, 0);
}));
t('age bands: 39 gives 0, 40 gives 1, 59 gives 1, 60 gives 2', () => {
  assert.strictEqual(scoreScreening({ age: 39 }).score, 0);
  assert.strictEqual(scoreScreening({ age: 40 }).score, 1);
  assert.strictEqual(scoreScreening({ age: 59 }).score, 1);
  assert.strictEqual(scoreScreening({ age: 60 }).score, 2);
  assert.strictEqual(scoreScreening({ age: 95 }).score, 2);
});
t('score 3 is not eligible, score 4 is (four or more)', () => {
  assert.strictEqual(scoreScreening({ age: 50, ii6: true, ii10: true }).eligible, false);  /* 1+1+1 */
  const r = scoreScreening({ age: 50, ii6: true, ii10: true, ii1: true });                 /* 1+1+1+1 */
  assert.strictEqual(r.score, 4); assert.strictEqual(r.eligible, true); assert.strictEqual(r.scoreMet, true); assert.strictEqual(r.part1Any, false);
});
t('age 60 plus two ticks reaches 4', () => {
  const r = scoreScreening({ age: 66, ii8: true, ii9: true }); assert.strictEqual(r.score, 4); assert.strictEqual(r.eligible, true);
});
t('each Part II tick is worth its form score', () => {
  ['ii1', 'ii2', 'ii3', 'ii6', 'ii7', 'ii8', 'ii9', 'ii10', 'ii11'].forEach((id) => assert.strictEqual(scoreScreening({ age: 20, [id]: true }).score, 1, id));
});
t('highest possible Part II score is 11', () => {
  const all = { age: 70 }; PART_II.forEach((x) => { if (!x.derived) all[x.id] = true; });
  assert.strictEqual(scoreScreening(all).score, 11);
});
t('Part I and a high score together are both reported', () => {
  const r = scoreScreening({ age: 62, i1: true, ii6: true, ii1: true }); assert.strictEqual(r.score, 4); assert.ok(r.part1Any && r.scoreMet);
});
t('false values do not score', () => {
  const r = scoreScreening({ age: 45, i1: false, ii6: false }); assert.strictEqual(r.score, 1); assert.strictEqual(r.eligible, false);
});
t('threshold is editable (5 makes score 4 not eligible)', () => {
  const a = { age: 50, ii6: true, ii10: true, ii1: true };
  assert.strictEqual(scoreScreening(a, { threshold: 5 }).eligible, false);
  assert.strictEqual(scoreScreening(a, { threshold: 4 }).eligible, true);
});
t('points are editable', () => {
  assert.strictEqual(scoreScreening({ age: 20, ii6: true }, { diabetes: 4 }).eligible, true);
  assert.strictEqual(scoreScreening({ age: 65 }, { ageHigh: 3 }).score, 3);
});
t('invalid or missing age throws', () => {
  [undefined, '', 0, 121, 4.5, 'abc', null].forEach((v) => assert.throws(() => scoreScreening({ age: v }), /Invalid age/));
  assert.strictEqual(validAge(1), true); assert.strictEqual(validAge(120), true);
});
t('every item has English and Malayalam text and unique ids', () => {
  const ids = PART_I.concat(PART_II).map((x) => x.id); assert.strictEqual(new Set(ids).size, ids.length);
  PART_I.concat(PART_II).forEach((x) => { assert.ok(x.en && x.ml, x.id); });
  assert.strictEqual(PART_I.length, 6); assert.strictEqual(PART_II.length, 11);
});
t('default config matches the form', () => {
  assert.deepStrictEqual([DEFAULT_CONFIG.threshold, DEFAULT_CONFIG.ageMid, DEFAULT_CONFIG.ageHigh], [4, 1, 2]);
});
console.log('\n' + n + ' scoring checks passed');
