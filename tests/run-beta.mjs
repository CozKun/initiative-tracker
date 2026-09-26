import assert from "node:assert/strict";
import { build } from "esbuild";
import sveltePlugin from "esbuild-svelte";
import sveltePreprocess from "svelte-preprocess";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { runNextBuildChecks } from "./next-build-checks.mjs";
import { runBuilderChecks } from "./builder-checks.mjs";

const root = process.cwd();
const out = path.join(root, "dist/beta-qa");
await mkdir(out, { recursive: true });
await build({
    stdin: { contents: 'import Harness from "./tests/BetaHarness.svelte"; new Harness({target:document.body});', resolveDir: root },
    outfile: path.join(out, "harness.js"), bundle: true, format: "iife", platform: "browser",
    plugins: [{ name: "obsidian-test-host", setup(builder) {
        builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: path.join(root, "tests/obsidian-stub.ts") }));
        builder.onResolve({ filter: /^src\/utils\/suggester$/ }, () => ({ path: path.join(root, "tests/suggester-stub.ts") }));
    } }, sveltePlugin({ preprocess: sveltePreprocess(), compilerOptions: { css: "injected" }, filterWarnings: () => false })]
});
const styles = await readFile(path.join(root, "styles.css"), "utf8");
const html = `<!doctype html><meta charset="utf-8"><style>
:root { --background-primary:#202126; --background-secondary:#292b32; --text-normal:#e5e6ec; --text-muted:#a3a7b4;
--background-modifier-border:#454956; --interactive-accent:#8e7ddb; --text-on-accent:white; --radius-m:8px; --radius-s:4px;
--font-ui-small:13px; --font-ui-smaller:12px; --font-monospace:monospace; --shadow-s:0 6px 22px #0008; }
body { margin:24px; background:#202126; color:#e5e6ec; font:14px system-ui; }
main { width:355px; } table { width:100%; border-collapse:collapse; } td,th { padding:9px 5px; text-align:left; }
button,input { font:inherit; color:inherit; background:#30323b; border:1px solid #454956; border-radius:4px; box-sizing:border-box; }
button { cursor:pointer; padding:5px 9px; } input { padding:6px 8px; } button:disabled { opacity:.45; cursor:default; }
input[type=checkbox] { width:16px; height:16px; } .mod-cta { background:#8e7ddb; } .outside { margin-top:22px; }
${styles}</style><body><script src="/harness.js"></script></body>`;
const server = createServer(async (request, response) => {
    response.setHeader("Content-Type", request.url === "/harness.js" ? "text/javascript" : "text/html");
    response.end(request.url === "/harness.js" ? await readFile(path.join(out, "harness.js")) : html);
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const playwright = process.argv[2] ? await import(pathToFileURL(process.argv[2]).href) : await import("playwright");
const browser = await playwright.chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 720, height: 600 } });
page.setDefaultTimeout(5000);
const errors = [];
page.on("pageerror", error => { errors.push(error.message); console.error("Browser:", error.stack); });
let checks = 0;
const check = (name) => { checks++; console.log(`PASS ${name}`); };
const hp = n => page.getByRole("button", { name: `Adjust health: Goblin ${n}`, exact: true });
const snapshot = () => page.evaluate(() => ({
    first: fixture.first.hp, second: fixture.second.hp, temp: fixture.second.temp,
    selected: fixture.get(fixture.tracker.updating).size,
    quick: fixture.get(fixture.tracker.quickHealth)?.creature.getName() ?? null,
    colours: fixture.plugin.data.recentBaseColours,
    firstColour: fixture.first.baseColor ?? null, secondColour: fixture.second.baseColor ?? null
}));
try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await hp(1).waitFor();
    await hp(1).click();
    assert.equal(await page.getByLabel("Damage amount").evaluate(el => el === document.activeElement), true);
    await page.getByLabel("Damage amount").fill("12");
    await hp(2).click();
    assert.equal(await page.getByLabel("Damage amount").inputValue(), "");
    assert.equal((await snapshot()).quick, "Goblin 2");
    await page.getByLabel("Damage amount").fill("12");
    await page.getByLabel("Damage amount").press("Enter");
    assert.deepEqual([(await snapshot()).first, (await snapshot()).second], [30,18]);
    check("misclick switches the sole target; Enter damages only Goblin 2");

    await hp(1).click(); await page.getByLabel("Damage amount").fill("8");
    await page.getByLabel("Damage amount").press("Escape");
    assert.equal((await snapshot()).quick, null); assert.equal((await snapshot()).first,30);
    await hp(1).click(); await page.getByLabel("Damage amount").fill("8");
    await page.getByRole("button",{name:"Outside panel"}).click();
    assert.equal((await snapshot()).quick,null); assert.equal((await snapshot()).first,30);
    check("Escape and outside clicks cancel without changing HP");

    await page.evaluate(() => fixture.second.temp = 5);
    await hp(2).click(); await page.getByLabel("Damage amount").fill("8"); await page.getByLabel("Damage amount").press("Enter");
    assert.equal((await snapshot()).second,15); assert.equal((await snapshot()).temp,0);
    await hp(2).click(); await page.getByRole("button", {name:"Heal", exact:true}).first().click();
    await page.getByLabel("Healing amount").fill("100"); await page.getByLabel("Healing amount").press("Enter");
    assert.equal((await snapshot()).second,30); check("quick HP preserves temporary HP absorption and healing limits");

    await hp(1).click();
    for (const invalid of ["", "0", "-5", "abc", "1.5", "9999999999999999999"]) {
        await page.getByLabel("Damage amount").fill(invalid);
        assert.equal(await page.locator('.quick-health button[type=submit]').isDisabled(),true);
    }
    await page.getByLabel("Damage amount").press("Escape"); check("invalid and empty damage cannot be applied");

    await page.setViewportSize({width:1200,height:900});
    await hp(1).click(); await page.getByRole("button", {name:"Apply effect…", exact:true}).click();
    assert.equal((await snapshot()).selected,1);
    await page.getByRole("button", {name:"Add targets", exact:true}).click();
    await page.getByRole("group", {name:"Effect targets"}).getByLabel("Goblin 2").check();
    assert.equal((await snapshot()).selected,2);
    const rows = page.locator('.updating-creature-table tbody tr');
    await rows.nth(1).locator('input[type=checkbox]').first().check();
    await page.locator('.updating-hp input[type=text]').first().fill("12");
    await page.locator('.updating-hp input[type=text]').first().press("Enter");
    assert.deepEqual([(await snapshot()).first,(await snapshot()).second],[18,24]);
    check("explicit effect targets retain per-creature saving throw damage");

    await page.evaluate(() => fixture.tracker.openEffect(fixture.first,true));
    await page.locator('.input-status input').fill("Prone");
    await page.locator('.input-status input').press("Enter");
    await page.locator('.updating-buttons [aria-label=Apply]').click();
    assert.equal(await page.evaluate(() => [...fixture.first.status].some(s => s.name === "Prone")),true);
    assert.equal((await snapshot()).first,18); check("conditions can be applied without damage");

    await page.evaluate(() => fixture.tracker.openEffect(fixture.first));
    await page.locator('.updating-hp input[type=text]').first().fill("99");
    await hp(2).click(); assert.equal((await snapshot()).selected,0);
    await page.getByRole("button", {name:"Apply effect…",exact:true}).click();
    assert.equal(await page.locator('.updating-hp input[type=text]').first().inputValue(),"");
    assert.equal((await snapshot()).selected,1);
    await page.locator('.updating-buttons [aria-label=Cancel]').click();
    check("quick HP clears group selection; new effects cannot inherit stale drafts");

    await page.evaluate(() => fixture.tracker.openEffect(fixture.first));
    const multiplier = page.getByLabel("HP multiplier for Goblin 1", {exact:true});
    assert.equal(await page.getByRole("columnheader", {name:"Multiplier (×)",exact:true}).count(),1);
    assert.match(await multiplier.getAttribute("title"), /0.5 = half/);
    await multiplier.fill("0");
    await page.locator('.updating-hp input[type=text]').first().fill("12");
    await page.locator('.updating-hp input[type=text]').first().press("Enter");
    assert.equal((await snapshot()).first,18);
    check("Multiplier label explains scaling; zero applies no damage");

    await page.evaluate(() => fixture.tracker.openEffect(fixture.first));
    for (const invalid of ["", "-2"]) {
        await multiplier.fill(invalid);
        await page.locator('.updating-hp input[type=text]').first().fill("12");
        await page.locator('.updating-buttons [aria-label=Apply]').click();
        assert.equal((await snapshot()).first,18);
        assert.equal((await snapshot()).selected,1);
        assert.equal(await page.getByRole("alert").count(),1);
    }
    await multiplier.press("Escape");
    assert.equal(await multiplier.inputValue(),"1");
    await multiplier.fill("0.5");
    await page.locator('.updating-hp input[type=text]').first().press("Enter");
    assert.equal((await snapshot()).first,12);
    check("invalid multipliers block application; Escape resets; fractional multipliers work");

    const swatches = page.getByRole("button", {name:"Mini Colour Indicator", exact:true});
    await swatches.nth(0).click(); await page.getByLabel("Hex colour",{exact:true}).fill("#123ABC");
    await page.getByRole("button",{name:"Apply colour",exact:true}).click();
    assert.equal((await snapshot()).firstColour,"#123ABC");
    assert.deepEqual((await snapshot()).colours,["#123ABC"]);
    await swatches.nth(1).click(); await page.getByRole("button",{name:"Use recent colour #123ABC",exact:true}).click();
    assert.equal((await snapshot()).secondColour,"#123ABC"); assert.deepEqual((await snapshot()).colours,["#123ABC"]);
    await swatches.nth(1).click(); await page.getByRole("button",{name:"No colour",exact:true}).click();
    assert.equal((await snapshot()).secondColour,null); assert.deepEqual((await snapshot()).colours,["#123ABC"]);
    check("recent swatches apply in one click; clearing a creature preserves history");
    await page.reload(); await swatches.nth(0).click();
    await page.getByRole("button",{name:"Use recent colour #123ABC",exact:true}).waitFor();
    await page.getByLabel("Hex colour",{exact:true}).fill("#FFFFFF");
    await page.getByLabel("Hex colour",{exact:true}).press("Escape");
    assert.deepEqual((await snapshot()).colours,["#123ABC"]); check("history survives reload; cancelled colours are not recorded");
    assert.deepEqual(await page.evaluate(() => fixture.recentColours(["#abcdef","invalid",null,"#ABCDEF",...Array.from({length:9},(_,i)=>`#00000${i}`)],"#123ABC")),
        ["#123ABC","#ABCDEF","#000000","#000001","#000002","#000003","#000004","#000005"]);
    check("history normalizes, deduplicates, and caps at eight valid colours");

    await page.setViewportSize({width:360,height:330});
    await swatches.nth(0).click();
    const bounds = await page.getByRole("dialog",{name:"Mini Colour Indicator picker"}).boundingBox();
    assert.ok(bounds.x>=0 && bounds.y>=0 && bounds.x+bounds.width<=360 && bounds.y+bounds.height<=330);
    await page.screenshot({path:path.join(out,"colour-picker.png")});
    await page.getByLabel("Hex colour",{exact:true}).press("Escape");
    await hp(2).click();
    await page.screenshot({path:path.join(out,"quick-health.png")});
    check("expanded colour picker stays within a small viewport");

    await page.getByLabel("Damage amount").press("Escape");
    await page.setViewportSize({width:720,height:600});
    await page.evaluate(() => fixture.setDifficultyScenario([5,5,5,5],0));
    const gauge = page.getByRole("meter",{name:"Encounter difficulty",exact:true});
    const scenarios = [[0,"Trivial",0],[1000,"Trivial",5],[2000,"Low",10],[2500,"Low",25],
        [3000,"Moderate",40],[3700,"Moderate",55],[4400,"High",70],[5800,"High",85]];
    for (const [xp,tier,position] of scenarios) {
        await page.evaluate(xp => fixture.setDifficultyScenario([5,5,5,5],xp),xp);
        await page.waitForFunction(expected => {
            const meter = document.querySelector('[role=meter]');
            return meter && Math.abs(Number(meter.getAttribute('aria-valuenow')) - expected) < .01;
        },position);
        assert.equal(await page.locator('.difficulty-caption strong').innerText(),tier);
        assert.match(await gauge.getAttribute('aria-valuetext'),new RegExp(tier));
    }
    assert.match(await page.locator('.difficulty-band[data-tier=Low]').getAttribute('aria-description'), /2,000 to below 3,000 XP/);
    check("difficulty bands match real level-5 party thresholds, including each exact boundary");
    const systemChecks = await page.evaluate(() => {
        const system = fixture.getRpgSystem(fixture.plugin);
        const parties = [...Array.from({length:20},(_,i)=>[i+1,i+1,i+1,i+1]),[3,5,7,9]];
        return parties.every(levels => {
            const thresholds = system.getDifficultyThresholds(levels);
            return thresholds.every((threshold,index) => {
                const scale = fixture.dnd55DifficultyScale(threshold.minValue,thresholds);
                return scale.position === [10,40,70][index];
            });
        });
    });
    assert.equal(systemChecks,true); check("band boundaries hold across levels 1–20 and a mixed-level party");
    assert.deepEqual(await page.locator('.legend-name').allTextContents(),['Trivial','Low','Moderate','High']);
    assert.equal(await page.locator('.difficulty-legend small, .difficulty-distance').count(),0);
    assert.ok((await page.locator('.difficulty-bands-container').boundingBox()).height < 70);
    check('tracker keeps compact difficulty labels and hover thresholds without builder detail rows');
    await page.evaluate(() => fixture.setDifficultyScenario([5,5,5,5],44000));
    await page.waitForFunction(() => Number(document.querySelector('[role=meter]')?.getAttribute('aria-valuenow')) > 98);
    assert.equal(await page.locator('.difficulty-caption strong').innerText(),"High");
    assert.match(await page.locator('.difficulty-caption span').innerText(),/44,000 XP/);
    assert.ok(Number(await gauge.getAttribute('aria-valuenow'))<100);
    check("over-budget High remains visible with exact XP and no false maximum");
    await page.evaluate(() => fixture.setDifficultyScenario([],44000));
    assert.equal(await page.locator('.difficulty-caption strong').innerText(),"Add party levels");
    assert.match(await page.locator('.difficulty-caption span').innerText(),/44,000 XP/);
    assert.equal(await gauge.count(),0); check("removing the party clears the difficulty indicator");
    assert.equal(await page.locator('.difficulty-distance').count(),0);
    await page.evaluate(() => fixture.setDifficultyScenario([5,5,5,5],3700));
    await page.waitForFunction(() => Math.abs(Number(document.querySelector('[role=meter]')?.getAttribute('aria-valuenow'))-55)<.01);
    await page.addStyleTag({content: '.obsidian-initiative-tracker h2 {font-size:9px;color:red;font-family:serif;font-variant:small-caps;letter-spacing:3px;text-transform:uppercase;}'});
    assert.deepEqual(await page.getByRole('heading',{name:'Test encounter',exact:true}).evaluate(el => ({
        size:getComputedStyle(el).fontSize,variant:getComputedStyle(el).fontVariant,
        transform:getComputedStyle(el).textTransform,color:getComputedStyle(el).color
    })),{size:'16px',variant:'normal',transform:'none',color:'rgb(229, 230, 236)'});
    check('actual tracker encounter heading uses the shared readable style despite theme heading overrides');
    await page.locator('.difficulty-bands-container').screenshot({path:path.join(out,'difficulty-bands.png')});
    await page.addStyleTag({content: ':root { --background-primary:#ece4d3; --text-normal:#372e28; --text-muted:#675b4d; --text-faint:#aaa294; } body {background:#ece4d3;color:#372e28}'});
    await page.locator('.difficulty-bands-container').screenshot({path:path.join(out,'difficulty-bands-light.png')});
    await page.locator('.initiatie-tracker-metadata').screenshot({path:path.join(out,'tracker-header-light.png')});
    await page.evaluate(() => fixture.setDifficultyScenario([5,5,5,5],500,'dnd5e'));
    assert.equal(await page.locator('meter.difficulty-bar').count(),1);
    assert.equal(await page.locator('.difficulty-bands').count(),0);
    check("other RPG systems keep their existing meter");
    await runBuilderChecks(page, `http://127.0.0.1:${server.address().port}`, out, check);
    await runNextBuildChecks(page, `http://127.0.0.1:${server.address().port}`, out, check);
    assert.deepEqual(errors,[]); check("no browser runtime errors");
    console.log(`${checks} beta interaction checks passed. Screenshots: ${out}`);
} catch (error) {
    console.error(await page.locator("body").innerText());
    await page.screenshot({path:path.join(out,"failure.png")});
    throw error;
} finally { await browser.close(); server.close(); }
