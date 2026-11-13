/* Scoring for the Community Screening form (nephrologist-approved, Peace Home).
   Pure functions, no DOM. Runs in Node for tests and is inlined into the page.

   Rule (form, step 1): a person should have the kidney screening test if
     - any item in Part I applies, OR
     - the Part II score is `threshold` or more (the form says "four or more" in step 1,
       and "more than four" in the Part II note: we use 4 or more, see docs). */

var DEFAULT_CONFIG = {
  version: 2,
  threshold: 4,
  ageMid: 1,      /* Part II item 4: age 40 to 59 */
  ageHigh: 2,     /* Part II item 5: age 60 and above */
  obesity: 1, stones: 1, painkillers: 1,
  diabetes: 1, heartAttack: 1, stroke: 1, anaemia: 1, smoking: 1, familyKidney: 1
};

var PART1_IDS = ['i1', 'i2', 'i3', 'i4', 'i5'];
/* Part II items the resident ticks. Items 4 and 5 are worked out from age. */
var PART2_TICK = [
  { id: 'ii1', key: 'obesity' }, { id: 'ii2', key: 'stones' }, { id: 'ii3', key: 'painkillers' },
  { id: 'ii6', key: 'diabetes' }, { id: 'ii7', key: 'heartAttack' }, { id: 'ii8', key: 'stroke' },
  { id: 'ii9', key: 'anaemia' }, { id: 'ii10', key: 'smoking' }, { id: 'ii11', key: 'familyKidney' }
];

function validAge(v) {
  var n = Number(v);
  return v !== '' && v != null && isFinite(n) && Math.floor(n) === n && n >= 1 && n <= 120;
}

function scoreScreening(a, cfgIn) {
  var cfg = Object.assign({}, DEFAULT_CONFIG, cfgIn || {});
  if (!validAge(a.age)) throw new Error('Invalid age');
  var age = Number(a.age);

  var part1 = PART1_IDS.filter(function (id) { return a[id] === true; });

  var items = [];
  if (age >= 60) items.push({ id: 'ii5', key: 'ageHigh', points: cfg.ageHigh });
  else if (age >= 40) items.push({ id: 'ii4', key: 'ageMid', points: cfg.ageMid });
  PART2_TICK.forEach(function (it) {
    if (a[it.id] === true) items.push({ id: it.id, key: it.key, points: cfg[it.key] });
  });
  var score = items.reduce(function (s, it) { return s + Number(it.points); }, 0);

  var part1Any = part1.length > 0;
  var scoreMet = score >= cfg.threshold;
  return {
    eligible: part1Any || scoreMet,
    part1: part1, part1Any: part1Any,
    score: score, items: items, scoreMet: scoreMet, threshold: cfg.threshold,
    age: age
  };
}

if (typeof module !== 'undefined') {
  module.exports = { DEFAULT_CONFIG: DEFAULT_CONFIG, PART1_IDS: PART1_IDS, PART2_TICK: PART2_TICK, validAge: validAge, scoreScreening: scoreScreening };
}
