# Peace Home Community Kidney Screening (MVP)

Resident self-screening app for the Kidney Disease Free Region programme, Ongallur Panchayath.
English and Malayalam, light and dark mode. A screening check, not a diagnosis.

**Source of truth:** `Community_Screening.pdf`, the nephrologist-approved form given by the Peace Home director.
It replaces the earlier 37-question draft completely. The Malayalam item text in the app is copied from that form;
`docs/questionnaire-source.md` has the English translation and the points that still need a decision.

## What it does
1. Resident enters age, then marks Part I (5 conditions) and Part II (11 scored items, ages from the age entered).
2. The app applies the form's rule: **eligible for the kidney screening test if any Part I item applies, or the Part II score is 4 or more.**
3. Eligible residents see the pathway from the form (screening test: Urine Routine, Albumin/Creatinine ratio, Blood Creatinine; nephrologist consultation; follow-up) and can share a name and mobile number so Peace Home can contact them.
4. Care team view: filters, search by name or mobile, per-person breakdown, CSV export, editable points and threshold.

Part II scores: age 40 to 59 = 1, age 60 and above = 2, every other item = 1 (maximum 11).

## Layout
    src/scoring.js          the rule (pure functions, no DOM)
    src/criteria.js         the form's items, English and Malayalam
    src/app.template.html   UI, styles and app logic
    src/test.js             18 scoring checks
    tests/e2e.js            browser test with a mocked database (needs Playwright)
    docs/                   translation of the source form and open decisions
    build.py                inlines everything into dist/index.html
    dist/index.html         the finished single-file site

## Run and test
    npm test                          # scoring checks
    python3 build.py                  # build dist/index.html
    NODE_PATH=<playwright> node tests/e2e.js dist/index.html
Open dist/index.html in a browser. No server and no dependencies are needed. See HOSTING.md for deployment.

## Data
Outside the Claude artifact page, screenings are saved in the browser of the phone that filled them in. Phones do not share data,
so the care team view only sees that device. Fine for walkthroughs, not for a pilot. For a pilot, replace `persist`, `syncQueue`,
`subscribe` and `saveCfg` in `src/app.template.html` with a backend and add staff login.
Record shape: `{ schema, answers, createdAt, lang, assisted, contact, sample }`.
Answers: `{ age, i1..i5, ii1, ii2, ii3, ii6..ii11 }` as booleans, numbered as on the form. Items ii4 and ii5 are worked out from age.

## Decisions needed from the nephrologist or director
1. **More than four, or four or more?** The Part II note says "more than four"; step 1 says "four or more". The app uses 4 or more. One number in the rules page.
2. **Part I items 3 and 4** (kidney disease already confirmed, past dialysis) currently qualify for the screening test like any other Part I item. Should they go straight to the nephrologist instead?
3. **"Excess weight"** has no BMI cut-off on the form, so it is a self-reported tick.
4. **What to tell people who do not qualify.** The form does not say; the app's wording is ours.
5. Consent wording and data protection (health data about named residents). Use example data only until settled.
