const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const html = fs.readFileSync(process.argv[2] || 'dist/index.html', 'utf8');
const mock = fs.readFileSync(__dirname + '/mock.js', 'utf8');
const legacySeed = "window.__store['screenings/old_1'] = { answers: { q1: 'no' }, createdAt: '2026-10-20T10:00:00.000Z', lang: 'en', sample: false };";
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  async function open(url, seed) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('pageerror ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource|net::ERR/.test(m.text())) errs.push('console ' + m.text()); });
    await p.addInitScript(mock); if (seed) await p.addInitScript(seed);
    await p.route('https://app.test/**', r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: html }));
    await p.goto(url); await p.waitForTimeout(300); return { ctx, p };
  }
  let { ctx, p } = await open('https://app.test/', legacySeed);
  const next = () => p.click('#nextBtn');
  const tick = id => p.click(`[data-act=tick][data-id="${id}"]`);
  const start = async () => { await p.click('[data-act=toggle][data-v=consent]'); await p.click('#startBtn'); };
  const setAge = async v => { await p.fill('#age', String(v)); };

  // welcome and consent
  ok(await p.isDisabled('#startBtn'), 'Start disabled until consent');
  ok(/Community kidney screening/.test(await p.textContent('#pagehead')), 'welcome title');
  await start();
  // step 1 age
  ok(await p.isDisabled('#nextBtn'), 'Next disabled until age entered');
  await setAge(0); await p.focus('#start-none').catch(() => {}); await p.locator('#age').blur(); ok(await p.isVisible('#ageErr'), 'age 0 shows error'); ok(await p.isDisabled('#nextBtn'), 'Next blocked on age 0');
  await setAge(4.5); ok(await p.isDisabled('#nextBtn'), 'decimal age blocked');
  await setAge(130); ok(await p.isDisabled('#nextBtn'), 'age 130 blocked');
  await setAge(62); ok(!(await p.isVisible('#ageErr')) && !(await p.isDisabled('#nextBtn')), 'age 62 accepted, error gone');
  await p.screenshot({ path: 'n_age.png' }); await next();
  // Part I
  ok(/Part I/.test(await p.textContent('.progress .cap')) && /Step 2 of 3/.test(await p.textContent('.progress .cap')), 'progress caption Part I');
  ok(await p.locator('[data-act=tick]').count() === 5, 'Part I has 5 items');
  ok(await p.isDisabled('#nextBtn'), 'Part I needs an answer');
  await tick('i1'); ok(await p.getAttribute('[data-act=tick][data-id="i1"]', 'aria-checked') === 'true', 'tick works');
  ok(await p.evaluate(() => document.activeElement.getAttribute('data-id')) === 'i1', 'focus stays on the ticked row');
  await p.click('[data-act=none][data-p="1"]'); ok(await p.getAttribute('[data-act=tick][data-id="i1"]', 'aria-checked') === 'false' && await p.getAttribute('[data-act=none]', 'aria-checked') === 'true', 'None of these clears ticks');
  await tick('i1'); ok(await p.getAttribute('[data-act=none]', 'aria-checked') === 'false', 'ticking again unchecks None');
  await p.screenshot({ path: 'n_p1.png' }); await next();
  // Part II
  ok(/Part II/.test(await p.textContent('.progress .cap')), 'progress caption Part II');
  ok(await p.locator('[data-act=tick]').count() === 9, 'Part II shows 9 tickable items (age rows come from age)');
  ok(await p.isDisabled('#nextBtn'), 'Part II needs an answer');
  await tick('ii1'); await tick('ii6'); ok((await p.textContent('#nextBtn')).trim() === 'See result', 'last step says See result');
  await p.screenshot({ path: 'n_p2.png' }); await next(); await p.waitForTimeout(250);
  ok(/as soon as possible/.test(await p.textContent('#pagehead')), 'eligible heading');
  ok(/Part I/.test(await p.textContent('.why')) && /Part II/.test(await p.textContent('.why')), 'reason mentions both parts');
  ok(await p.locator('.path > li').count() === 4 && await p.locator('.path .tests li').count() === 3, 'pathway of 4 steps with 3 tests');
  ok(/Urine Routine/.test(await p.textContent('.path')) && /Blood Creatinine Test/.test(await p.textContent('.path')), 'tests named as on the form');
  ok(/sent to the care team/.test(await p.textContent('#savedLine')), 'saved/synced line');
  const rec = await p.evaluate(() => Object.entries(window.__store).filter(([k, v]) => k.startsWith('screenings/r_')).map(([k, v]) => v)[0]);
  ok(rec && rec.schema === 2 && rec.answers.age === 62 && rec.answers.i1 === true && rec.answers.i2 === false && rec.answers.ii1 === true && rec.answers.ii6 === true && rec.answers.ii2 === false && !('ii4' in rec.answers), 'record saved with schema 2 and explicit booleans');
  await p.screenshot({ path: 'n_result.png', fullPage: true });
  // contact
  await p.click('[data-act=contact]'); await p.waitForSelector('#sheet[open]');
  await p.click('#contactForm button[type=submit]'); ok(await p.isVisible('#cnErr'), 'empty name error');
  await p.fill('#cn', 'Test Resident'); await p.fill('#cm', '98470'); await p.click('#contactForm button[type=submit]'); ok(await p.isVisible('#cmErr'), 'short mobile error');
  await p.fill('#cm', '9847012345'); await p.click('#contactForm button[type=submit]'); await p.waitForTimeout(200);
  ok(await p.isVisible('.done'), 'thanks banner');
  const rec2 = await p.evaluate(() => Object.values(window.__store).find(v => v.answers && v.answers.age === 62));
  ok(rec2 && rec2.contact && rec2.contact.mobile === '9847012345', 'contact saved on record');
  await p.click('[data-act=reset]'); ok(await p.isVisible('#startBtn'), 'Done returns to welcome');

  // not eligible, then the boundary 3 vs 4
  const run = async (age, p1, p2) => {
    await setAge(age); await next();
    if (p1.length) for (const i of p1) await tick(i); else await p.click('[data-act=none][data-p="1"]'); await next();
    if (p2.length) for (const i of p2) await tick(i); else await p.click('[data-act=none][data-p="2"]'); await next(); await p.waitForTimeout(200);
  };
  await start(); await run(35, [], []);
  ok(/not advised/.test(await p.textContent('#pagehead')) && await p.locator('.path').count() === 0, 'age 35 with nothing: not advised, no pathway');
  await p.screenshot({ path: 'n_not.png' });
  await p.click('[data-act=retake]'); ok(await p.isVisible('#startBtn') && !(await p.isDisabled('#startBtn')), 'Answer again keeps consent');
  await p.click('#startBtn'); await run(50, [], ['ii6', 'ii10']);
  ok(/not advised/.test(await p.textContent('#pagehead')), 'age 50 + 2 ticks = score 3: not advised');
  await p.click('[data-act=retake]'); await p.click('#startBtn'); await run(50, [], ['ii6', 'ii10', 'ii1']);
  ok(/as soon as possible/.test(await p.textContent('#pagehead')) && /Part II/.test(await p.textContent('.why')) && !/Part I\b[^I]/.test(await p.textContent('.why')), 'age 50 + 3 ticks = score 4: eligible by score only');
  await p.click('[data-act=reset]');
  await start(); await run(29, ['i4'], []);
  ok(/as soon as possible/.test(await p.textContent('#pagehead')) && /Part I/.test(await p.textContent('.why')), 'a single Part I item at age 29 is eligible');
  await p.click('[data-act=reset]');

  // Malayalam: verbatim form text and corrected place name
  await p.click('[data-act=lang][data-v=ml]');
  ok(/ഓങ്ങല്ലൂർ/.test(await p.textContent('body')) && !/ഒറ്റപ്പാലം/.test(await p.textContent('body')), 'Ongallur spelling');
  await start(); await setAge(66); await next();
  const mlHead = await p.textContent('#qh');
  ok(mlHead.includes('താഴെ പറയുന്ന കാര്യങ്ങളിൽ നിന്ന് താങ്കൾക്ക് ബാധകമായവയെല്ലാം') && mlHead.includes('അടയാളപ്പെടുത്തുക'), 'Part I heading is the form text');
  ok((await p.textContent('.group')).includes('ഇതിനകം കിഡ്നി രോഗം സ്ഥിരീകരിച്ചവർ') && (await p.textContent('.group')).includes('മുൻപ് എപ്പോഴെങ്കിലും ഡയാലിസിസിന് വിധേയമായിട്ടുള്ളവർ'), 'Part I items are the form text');
  await p.click('[data-act=none][data-p="1"]'); await next();
  ok((await p.textContent('.group')).includes('ദീർഘകാലമായി കിഡ്നിയെ ബാധിക്കാവുന്ന മരുന്നുകളുടെ (വേദനസംഹാരിയുടെ) ഉപയോഗം'), 'Part II item 3 is the form text');
  await tick('ii8'); await tick('ii9'); await next(); await p.waitForTimeout(200);
  ok((await p.textContent('#pagehead')).includes('കിഡ്നി സ്ക്രീനിംഗ് ടെസ്റ്റിന് എത്രയും വേഗം വിധേയമാകേണ്ടതാണ്'), 'result headline is the form sentence (66 + stroke + anaemia = 4)');
  ok(await p.evaluate(() => document.documentElement.lang) === 'ml', 'lang=ml');
  await p.screenshot({ path: 'n_result_ml.png', fullPage: true });
  await p.click('[data-act=lang][data-v=en]'); await p.click('[data-act=reset]');

  // theme switch
  const bg = () => p.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await p.emulateMedia({ colorScheme: 'dark' }); await p.reload(); await p.waitForTimeout(200);
  const bgLight = await bg(); ok(bgLight === 'rgb(239, 242, 246)', 'default light even when system is dark');
  await p.click('.tsw'); ok(await bg() === 'rgb(9, 13, 18)' && await p.getAttribute('.tsw', 'aria-checked') === 'true', 'switch to dark');
  await p.screenshot({ path: 'n_dark.png' }); await p.reload(); await p.waitForTimeout(200); ok(await bg() === 'rgb(9, 13, 18)', 'dark persists');
  await p.click('.tsw'); ok(await bg() === bgLight, 'back to light'); await p.emulateMedia({ colorScheme: 'light' });

  // care view: legacy record handling
  await p.click('[data-act=care]'); await p.waitForTimeout(300);
  ok(await p.locator('.rec').count() === 0, 'legacy record is not listed as a screening');
  ok(/1 screenings from the earlier draft/.test(await p.textContent('.banner.info')), 'legacy banner counts the old record');
  await p.click('[data-act=confirmlegacy]'); ok(await p.isVisible('[data-act=rmlegacy]'), 'inline confirm for deleting legacy'); await p.click('[data-act=rmlegacy]'); await p.waitForTimeout(250);
  ok(await p.evaluate(() => !('screenings/old_1' in window.__store)), 'legacy record deleted'); ok(await p.locator('[data-act=confirmlegacy]').count() === 0, 'banner gone');
  await ctx.close();

  // care view in a fresh store: samples, filters, rules, csv
  ({ ctx, p } = await open('https://app.test/#care'));
  ok(await p.isVisible('[data-act=samples]'), '#care opens clinic view with empty state');
  await p.click('[data-act=samples]'); await p.waitForTimeout(300);
  const cnt = async () => p.locator('.rec').count();
  ok(await cnt() === 12, '12 examples');
  await p.click('[data-act=filter][data-v=eligible]'); ok(await cnt() === 8, 'eligible = 8, got ' + await cnt());
  await p.click('[data-act=filter][data-v=not]'); ok(await cnt() === 4, 'not eligible = 4, got ' + await cnt());
  await p.click('[data-act=filter][data-v=nocontact]'); ok(await cnt() === 2, 'eligible without contact = 2, got ' + await cnt());
  await p.click('[data-act=filter][data-v=all]');
  await p.fill('#q', 'Asha'); ok(await cnt() === 1, 'search by name'); await p.fill('#q', '9847000011'); ok(await cnt() === 1, 'search by mobile'); await p.fill('#q', '');
  ok(await p.locator('.rec').first().evaluate(e => /Test advised/.test(e.textContent)), 'eligible sorted first');
  await p.locator('.rec').first().click(); ok(await p.isVisible('.dhead h2'), 'detail opens');
  ok(await p.locator('.detailpane .group').nth(3).locator('.kv').count() === 5, 'Part I answers list all 5');
  ok(await p.locator('.detailpane .group').nth(4).locator('.kv').count() === 11, 'Part II answers list all 11');
  await p.screenshot({ path: 'n_care_phone.png', fullPage: true });
  await p.click('[data-act=closedetail]');
  await p.click('[data-act=confirmrm]'); ok(await p.isVisible('[data-act=rmsamples]'), 'inline confirm for examples'); await p.click('[data-act=confirmno]'); ok(await cnt() === 12, 'cancel keeps records');
  await p.click('[data-act=csv]'); await p.waitForTimeout(200);
  const saved = await p.evaluate(() => window.__saved); const lines = saved[0].data.split('\n');
  ok(saved.length === 1 && lines.length === 13 && lines[0].split(',').length === 28, 'CSV: 12 rows + header, 28 columns (' + lines.length + ' lines, ' + lines[0].split(',').length + ' cols)');
  ok(/,yes,part I \+ part II score,/.test(lines[1]) || lines.some(l => /part II score,/.test(l)), 'CSV carries the reason');
  await p.click('[data-act=rules]'); await p.fill('#cfg_threshold', '5'); await p.click('[data-act=cfgsave]'); await p.waitForTimeout(250);
  ok((await p.evaluate(() => window.__store['config/criteria'])).threshold === 5, 'threshold saved');
  await p.click('[data-act=closedetail]'); await p.click('[data-act=filter][data-v=eligible]'); ok(await cnt() === 6, 'threshold 5 re-scores: eligible = 6, got ' + await cnt());
  await p.click('[data-act=rules]'); await p.click('[data-act=confirmreset]'); await p.click('[data-act=cfgreset]'); await p.waitForTimeout(250);
  ok((await p.evaluate(() => window.__store['config/criteria'])).threshold === 4, 'restored to 4');
  await p.click('[data-act=closedetail]'); await p.click('[data-act=filter][data-v=eligible]'); ok(await cnt() === 8, 'eligible back to 8');
  await p.click('[data-act=filter][data-v=all]'); await p.click('[data-act=confirmrm]'); await p.click('[data-act=rmsamples]'); await p.waitForTimeout(300);
  ok(await cnt() === 0 && await p.isVisible('[data-act=samples]'), 'examples removed, empty state');
  await p.click('[data-act=samples]'); await p.waitForTimeout(300);


  // standalone (no Claude runtime), as on Netlify
  {
    const ctxS = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true }); const q = await ctxS.newPage();
    q.on('pageerror', e => errs.push('standalone pageerror ' + e.message));
    q.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource|net::ERR/.test(m.text())) errs.push('standalone console ' + m.text()); });
    await q.route('https://app.test/**', r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: html }));
    await q.goto('https://app.test/'); await q.waitForTimeout(200);
    await q.click('[data-act=toggle][data-v=consent]'); await q.click('#startBtn'); await q.fill('#age', '62'); await q.click('#nextBtn');
    await q.click('[data-act=tick][data-id=i1]'); await q.click('#nextBtn'); await q.click('[data-act=none][data-p="2"]'); await q.click('#nextBtn'); await q.waitForTimeout(250);
    const sl = await q.textContent('#savedLine'); ok(/Saved on this device\./.test(sl) && !/will be sent/.test(sl), 'standalone saved line is accurate: ' + sl);
    await q.click('[data-act=contact]'); await q.fill('#cn', 'Local Person'); await q.fill('#cm', '9847000099'); await q.click('#contactForm button[type=submit]'); await q.waitForTimeout(200);
    ok(await q.isVisible('.done'), 'standalone contact saved');
    await q.click('[data-act=reset]'); await q.click('[data-act=care]'); await q.waitForTimeout(200);
    ok(await q.locator('.rec').count() === 1 && /Local Person/.test(await q.textContent('.rec')), 'standalone care view lists the local screening with its contact');
    ok(/saved on this device only/.test(await q.textContent('.banner.info')), 'standalone banner explains device-only storage');
    const [dl] = await Promise.all([q.waitForEvent('download'), q.click('[data-act=csv]')]);
    const csv = fs.readFileSync(await dl.path(), 'utf8');
    ok(dl.suggestedFilename() === 'kidney-screenings.csv' && csv.charCodeAt(0) === 0xFEFF && csv.split('\n').length === 2 && /Local Person/.test(csv), 'standalone CSV downloads (with BOM): ' + dl.suggestedFilename());
    await q.click('[data-act=rules]'); ok(!(await q.isDisabled('#cfg_threshold')), 'rules editable standalone');
    await q.fill('#cfg_threshold', '6'); await q.click('[data-act=cfgsave]'); await q.waitForTimeout(150);
    await q.reload(); await q.waitForTimeout(200); await q.click('[data-act=care]'); await q.click('[data-act=rules]');
    ok(await q.inputValue('#cfg_threshold') === '6', 'standalone rules persist after reload');
    ok(await q.locator('[data-act=filter]').count() === 4, 'filters present');
    await ctxS.close();
  }
  // layouts and overflow
  const overflow = async (label) => { const r = await p.evaluate(() => { const w = document.documentElement.clientWidth; const bad = [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > w + 1 && getComputedStyle(el).position !== 'fixed').slice(0, 3).map(el => el.tagName + '.' + el.className + ' ' + Math.round(el.getBoundingClientRect().right)); return { sw: document.documentElement.scrollWidth, w, bad }; }); ok(r.sw <= r.w + 1, 'no horizontal overflow: ' + label + ' ' + (r.sw <= r.w + 1 ? '' : JSON.stringify(r))); };
  await p.setViewportSize({ width: 1280, height: 800 }); await p.waitForTimeout(100);
  await p.locator('.rec').first().click(); await overflow('desktop care'); await p.screenshot({ path: 'n_care_desktop.png' });
  await p.click('.tsw'); await p.screenshot({ path: 'n_care_desktop_dark.png' }); await p.click('.tsw');
  await p.setViewportSize({ width: 390, height: 844 }); await p.click('[data-act=closedetail]').catch(() => {}); await overflow('phone care');
  await p.click('[data-act=resident]'); await overflow('phone welcome');
  await p.addStyleTag({ content: 'html{font-size:32px!important}' }); await p.click('[data-act=lang][data-v=ml]'); await overflow('200% text welcome, Malayalam');
  await start(); await overflow('200% text age, Malayalam'); await setAge(70); await next(); await overflow('200% text Part I, Malayalam'); await p.screenshot({ path: 'n_200_p1.png' });
  await tick('i3'); await next(); await tick('ii11'); await next(); await p.waitForTimeout(200); await overflow('200% text result, Malayalam'); await p.screenshot({ path: 'n_200_result.png', fullPage: true });
  ok(errs.length === 0, 'no page errors ' + JSON.stringify(errs));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
