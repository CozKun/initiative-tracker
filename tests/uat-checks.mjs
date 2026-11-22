import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

export async function runUatChecks(page, url, check) {
    await page.goto(url);
    const damage = await page.evaluate(() => {
        const {Creature, tracker, plugin} = fixture;
        plugin.data.autoStatus = false; tracker.setData(plugin.data);
        const results = [];
        for (const multiplier of [0, 0.5, 1, 2]) {
            const targets = Array.from({length:4}, (_, i) => new Creature({name:`Target ${i}`, hp:100}));
            tracker.set(targets);
            tracker.updating.set(new Map(targets.map((c,i) => [c, {saved:!!(i&1), resist:!!(i&2), customMod:String(multiplier)}])));
            tracker.doUpdate('12', [], '');
            results.push(targets.map(c => 100-c.hp));
        }
        return results;
    });
    assert.deepEqual(damage, [[0,0,0,0],[6,3,3,1],[12,6,6,3],[24,12,12,6]]);
    check('damage matrix: normal, saved, resistant and both at multipliers 0, 0.5, 1 and 2, including integer rounding');
    const hp = page.getByRole('button', {name:'Adjust health: Target 0',exact:true});
    await hp.click();
    await page.getByLabel('Damage amount',{exact:true}).fill('7');
    await page.locator('.quick-health button[type=submit]').evaluate(el => {el.click(); el.click();});
    assert.equal(await page.evaluate(()=>fixture.get(fixture.tracker)[0].hp),69);
    check('two immediate quick-health Apply clicks commit damage only once');

    if (!process.env.UAT_VAULT) return;
    const root=process.env.UAT_VAULT;
    const read=async p=>JSON.parse((await readFile(path.join(root,p),'utf8')).replace(/^\uFEFF/,''));
    const data=await read('Fixtures/Original tracker data.json');
    const fsb=await read('Fixtures/Original Fantasy Statblocks data.json');
    const result=await page.evaluate(({data,fsb})=>{
        const {Creature,plugin,getRpgSystem}=fixture;
        plugin.data=data;
        plugin.getCreatureFromBestiary=name=>fsb.monsters.find(([key])=>key===name)?.[1]??null;
        const mismatches=[]; let count=0;
        const fields=['name','id','initiative','static','currentHP','currentMaxHP','currentAC','tempHP','status','baseColor','enabled','active','hidden','friendly','player','level','cr','xp','path','autoUnconsciousName'];
        for(const [name, encounter] of Object.entries(data.encounters)) {
            for(const original of encounter.creatures) {
                const restored=Creature.fromJSON(JSON.parse(JSON.stringify(original)),plugin).toJSON();count++;
                for(const key of fields) if(original[key]!==undefined && JSON.stringify(original[key])!==JSON.stringify(restored[key])) mismatches.push({name,creature:original.name,key,expected:original[key],actual:restored[key]});
            }
        }
        const pfEncounter=data.encounters['06 - PF2e native sample - level 1 party'];
        const levels=pfEncounter.creatures.filter(c=>c.player).map(c=>c.level);
        const enemies=new Map(pfEncounter.creatures.filter(c=>!c.player).map(c=>[c,1]));
        const pf=getRpgSystem(plugin,'pathfinder2e').getEncounterDifficulty(enemies,levels);
        return {mismatches,count,pf:pf.value};
    },{data,fsb});
    assert.deepEqual(result.mismatches,[]);
    check(`test-vault saved creatures round-trip through production serialization (${result.count} creatures across ${Object.keys(data.encounters).length} encounters)`);
    assert.equal(result.pf,120);
    check('native PF2e sample totals 120 XP: two party-level-minus-two creatures at 20 each and one party-level-plus-two at 80');
}
