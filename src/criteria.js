/* Items of the Community Screening form. Malayalam is copied from the nephrologist-approved form
   (Community_Screening.pdf). English is a working translation. */

var PART_I = [
  { id: 'i1', en: 'High blood pressure', ml: 'ഉയർന്ന രക്ത സമ്മർദ്ദമുള്ളവർ' },
  { id: 'i2', en: 'Heart disease', ml: 'ഹൃദ്രോഗമുള്ളവർ' },
  { id: 'i3', en: 'Kidney disease already confirmed', ml: 'ഇതിനകം കിഡ്നി രോഗം സ്ഥിരീകരിച്ചവർ' },
  { id: 'i4', en: 'Needed dialysis at any time in the past', ml: 'മുൻപ് എപ്പോഴെങ്കിലും ഡയാലിസിസിന് വിധേയമായിട്ടുള്ളവർ' },
  { id: 'i5', en: 'Higher than normal protein (albumin) in the urine', ml: 'മൂത്രത്തിൽ പ്രോട്ടീനിന്റെ (ആൽബുമിൻ) അളവ് കൂടുതലുള്ളവർ' }
];

/* Part II. `derived: true` rows come from age and are not ticked by the resident. */
var PART_II = [
  { id: 'ii1', key: 'obesity', en: 'Excess weight (overweight)', ml: 'അമിത വണ്ണം' },
  { id: 'ii2', key: 'stones', en: 'Recurrent kidney stones', ml: 'ആവർത്തിച്ചുള്ള കിഡ്നിയിലെ കല്ല്' },
  { id: 'ii3', key: 'painkillers', en: 'Long-term use of medicines that can affect the kidneys (painkillers)', ml: 'ദീർഘകാലമായി കിഡ്നിയെ ബാധിക്കാവുന്ന മരുന്നുകളുടെ (വേദനസംഹാരിയുടെ) ഉപയോഗം' },
  { id: 'ii4', key: 'ageMid', derived: true, en: 'Age 40 to 59', ml: 'പ്രായം 40 മുതൽ 59 വരെ' },
  { id: 'ii5', key: 'ageHigh', derived: true, en: 'Age 60 and above', ml: 'പ്രായം 60 നു മുകളിൽ' },
  { id: 'ii6', key: 'diabetes', en: 'Diabetes', ml: 'പ്രമേഹം' },
  { id: 'ii7', key: 'heartAttack', en: 'Heart attack', ml: 'ഹൃദയാഘാതം' },
  { id: 'ii8', key: 'stroke', en: 'Stroke', ml: 'പക്ഷാഘാതം' },
  { id: 'ii9', key: 'anaemia', en: 'Anaemia', ml: 'അനീമിയ' },
  { id: 'ii10', key: 'smoking', en: 'Smoking', ml: 'പുകവലി' },
  { id: 'ii11', key: 'familyKidney', en: 'Kidney disease confirmed in anyone in the family', ml: 'കുടുംബത്തിൽ ആർക്കെങ്കിലും കിഡ്നി രോഗം സ്ഥിരീകരിച്ചിട്ടുള്ളവർ' }
];

/* The kidney screening test, as listed on the form. */
var TESTS = [
  { en: 'Urine Routine', enNote: 'Routine urine examination', ml: 'മൂത്രത്തിന്റെ സാധാരണ പരിശോധന' },
  { en: 'Albumin / Creatinine ratio', enNote: 'Urine test', ml: 'ആൽബുമിൻ / ക്രിയാറ്റിനിൻ അനുപാതം' },
  { en: 'Blood Creatinine Test', enNote: 'Blood test for creatinine', ml: 'രക്തത്തിലെ ക്രിയാറ്റിനിൻ പരിശോധന' }
];

function itemById(id) {
  return PART_I.concat(PART_II).filter(function (x) { return x.id === id; })[0];
}

if (typeof module !== 'undefined') {
  module.exports = { PART_I: PART_I, PART_II: PART_II, TESTS: TESTS, itemById: itemById };
}
