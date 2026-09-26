import assert from 'node:assert/strict';
import path from 'node:path';
export async function runNextBuildChecks(page, url, out, check) {
    await page.goto(url);
    await page.setViewportSize({width:1200,height:900});
    const groups = await page.evaluate(() => {
        const {Creature, tracker, plugin, sharesInitiative} = fixture;
        const copies = ['#FF0000','#0000FF','#00FF00','#FFFF00'].map(baseColor => new Creature({name:'Guard',hp:30,ac:14,modifier:2,baseColor}));
        const different = new Creature({name:'Guard',hp:30,ac:14,modifier:3});
        const ally = new Creature({name:'Guard',hp:30,ac:14,modifier:2,friendly:true});
        const fixed = new Creature({name:'Guard',hp:30,ac:14,modifier:2,static:true},0);
        const players = [new Creature({name:'Hero',player:true,modifier:2}),new Creature({name:'Hero',player:true,modifier:2})];
        plugin.data.condense=true; plugin.data.rollPlayerInitiatives=0;
        tracker.setData(plugin.data); tracker.set([...copies,different,ally,fixed,...players]);
        let rolls=0;plugin.getInitiativeValue=()=>++rolls+10;
        tracker.roll(plugin);
        const initial=copies.map(c=>c.initiative);
        const values=[different.initiative,ally.initiative];
        const fixedValue=fixed.initiative;
        plugin.data.condense=false;tracker.setData(plugin.data);tracker.update();
        const unchanged=copies.map(c=>c.initiative);
        const mismatch=!sharesInitiative(new Creature({name:'A',modifier:[1]}),new Creature({name:'A',modifier:[1,2]}));
        return {initial,values,fixedValue,unchanged,mismatch,playerMatch:sharesInitiative(...players),colours:copies.map(c=>c.baseColor)};
    });
    assert.equal(new Set(groups.initial).size,1);assert.notEqual(groups.values[0],groups.initial[0]);assert.notEqual(groups.values[1],groups.initial[0]);
    assert.equal(groups.fixedValue,0);assert.deepEqual(groups.unchanged,groups.initial);assert.equal(groups.mismatch,true);assert.equal(groups.playerMatch,false);assert.equal(new Set(groups.colours).size,4);
    check('four differently coloured copies share rolled initiative; modifiers, allies, players and fixed zero remain distinct; toggling does not alter combat');

    const recovery = await page.evaluate(() => {
        const {Creature,tracker,plugin}=fixture;
        const condition=plugin.data.statuses.find(s=>s.id===plugin.data.unconsciousId);
        plugin.data.autoStatus=true;plugin.data.autoRemoveUnconscious=true;tracker.setData(plugin.data);
        const auto=new Creature({name:'Auto',hp:10}),manual=new Creature({name:'Manual',hp:10});
        manual.addCondition(condition);tracker.set([auto,manual]);
        tracker.updateCreatures({creature:auto,change:{hp:-10}},{creature:manual,change:{hp:-10}});
        const stored=auto.toJSON(); const restored=Creature.fromJSON(stored,plugin);
        tracker.set([restored,manual]);tracker.updateCreatures({creature:restored,change:{temp:5}});
        const tempKept=[...restored.status].some(s=>s.name===condition.name);
        tracker.updateCreatures({creature:restored,change:{hp:3}},{creature:manual,change:{hp:3}});
        const removed=!restored.status.size,manualKept=manual.status.size===1;
        plugin.data.autoRemoveUnconscious=false;tracker.setData(plugin.data);
        tracker.updateCreatures({creature:restored,change:{hp:-20}});tracker.updateCreatures({creature:restored,change:{hp:3}});
        const offKept=restored.status.size===1;
        const deliberate=new Creature({name:'Deliberate',hp:1}); tracker.set([deliberate]);plugin.data.autoRemoveUnconscious=true;tracker.setData(plugin.data);
        tracker.updateCreatures({creature:deliberate,change:{hp:-1}});deliberate.addCondition(condition);tracker.updateCreatures({creature:deliberate,change:{hp:1}});
        return {stored:stored.autoUnconsciousName===condition.name,tempKept,removed,manualKept,offKept,deliberateKept:deliberate.status.size===1};
    });
    assert.ok(Object.values(recovery).every(Boolean));check('automatic Unconscious provenance survives save/load; healing clears only automatic conditions, respecting opt-out and temp HP');

    await page.evaluate(()=>{
        fixture.tracker.set([fixture.first,fixture.second]);fixture.first.hp=5;fixture.second.hp=6;
        fixture.tracker.openEffect(fixture.first);fixture.tracker.setUpdate(fixture.second);
    });
    const panel=page.getByRole('dialog',{name:'Apply effect',exact:true});
    await panel.getByRole('button',{name:'Heal',exact:true}).click();
    await panel.getByLabel('Heal each target for',{exact:true}).fill('12');
    await panel.getByRole('button',{name:'Goblin 1',exact:true}).click();
    assert.equal(await page.evaluate(()=>window.openedCombatant===fixture.first.id),true);
    assert.equal(await panel.isVisible(),true);assert.equal(await panel.getByLabel('Heal each target for',{exact:true}).inputValue(),'12');
    await page.evaluate(()=>{for(const entry of fixture.get(fixture.tracker.updating).values()){entry.saved=true;entry.resist=true;}});
    await panel.getByLabel('Set individual healing amounts',{exact:true}).check();
    await panel.getByLabel('Healing for Goblin 2',{exact:true}).fill('4');
    await panel.getByRole('button',{name:'Apply',exact:true}).click();
    assert.deepEqual(await page.evaluate(()=>[fixture.first.hp,fixture.second.hp]),[17,10]);
    check('group heal applies per target with optional overrides; damage saves/resistance do not reduce healing; statblock clicks retain draft');

    await page.evaluate(()=>fixture.tracker.openEffect(fixture.first));
    await panel.getByRole('button',{name:'Temp HP',exact:true}).click();await panel.locator('.updating-hp input[type=text]').first().fill('8');await panel.getByRole('button',{name:'Apply',exact:true}).click();
    assert.equal(await page.evaluate(()=>fixture.first.temp),8);
    await page.evaluate(()=>fixture.tracker.openEffect(fixture.first));await panel.getByRole('button',{name:'Max HP',exact:true}).click();
    await panel.locator('.updating-hp input[type=text]').first().fill('5');await panel.getByRole('button',{name:'Apply',exact:true}).click();
    assert.equal(await page.evaluate(()=>fixture.first.current_max),35);
    await page.evaluate(()=>fixture.tracker.openEffect(fixture.first));
    await panel.getByRole('button',{name:'Temp HP',exact:true}).click();
    await panel.getByLabel('Temporary HP action',{exact:true}).selectOption('remove');
    await panel.locator('.updating-hp input[type=text]').first().fill('3');
    await panel.getByRole('button',{name:'Apply',exact:true}).click();
    assert.equal(await page.evaluate(()=>fixture.first.temp),5);
    await page.evaluate(()=>{
        fixture.first.addCondition({name:'Custom condition',id:'old-custom-id',description:''});
        fixture.tracker.openEffect(fixture.first);
    });
    await panel.getByRole('button',{name:'Conditions',exact:true}).click();
    await panel.getByLabel('Condition',{exact:true}).fill('Custom condition');
    await panel.getByRole('button',{name:'Add to effect',exact:true}).click();
    await panel.getByLabel('Conditions',{exact:true}).selectOption('remove');
    await panel.getByRole('button',{name:'Apply',exact:true}).click();
    assert.equal(await page.evaluate(()=>[...fixture.first.status].some(s=>s.name==='Custom condition')),false);
    check('temporary HP grant/removal, maximum HP and removing saved custom conditions retain expected behaviour');

    await page.getByRole('button',{name:'Test save encounter',exact:true}).click();
    const save=page.getByRole('dialog',{name:'Save encounter',exact:true});await save.getByLabel('Encounter name',{exact:true}).fill('Playtest save');await save.getByRole('button',{name:'Save encounter',exact:true}).click();
    assert.equal(await save.count(),0);
    await page.getByRole('button',{name:'Test save encounter',exact:true}).click();await save.getByLabel('Encounter name',{exact:true}).fill('Playtest save');await save.getByRole('button',{name:'Save encounter',exact:true}).click();
    assert.equal(await save.getByRole('button',{name:'Overwrite encounter',exact:true}).count(),1);await save.getByRole('button',{name:'Overwrite encounter',exact:true}).click();
    check('floating encounter save works and confirms duplicate-name overwrites');

    await page.evaluate(()=>{
        fixture.first.active=true;fixture.first.initiative=19;fixture.second.initiative=8;
        fixture.plugin.players=new Map([['Aria',new fixture.Creature({name:'Aria',hp:22,ac:15,level:3,player:true})]]);
    });
    for(const role of ['ally','player']){
        await page.getByRole('button',{name:'Test add combatant',exact:true}).click();const form=page.locator('.coz-add-combatant');
        await form.getByLabel('Combatant type',{exact:true}).selectOption(role);
        if(role==='player'){await form.getByLabel('Search saved players',{exact:true}).fill('Aria');await form.getByRole('button',{name:'Aria',exact:true}).click();}
        else {await form.getByLabel('Search bestiary',{exact:true}).fill('Ogre');await form.getByRole('button',{name:'Ogre',exact:true}).click();}
        await form.getByLabel('Initiative',{exact:true}).fill('0');await form.getByRole('button',{name:'Add to encounter',exact:true}).click();
        assert.equal(await form.count(),0);
    }
    const added=await page.evaluate(()=>fixture.get(fixture.tracker).map(c=>({name:c.name,player:!!c.player,ally:c.friendly,initiative:c.initiative,active:!!c.active})));
    assert.equal(added[0].initiative,19);assert.equal(added[0].active,true);assert.equal(added[1].initiative,8);
    assert.deepEqual(added.slice(2),[{name:'Ogre',player:false,ally:true,initiative:0,active:false},{name:'Aria',player:true,ally:false,initiative:0,active:false}]);
    assert.equal(await page.locator('.name.ally').evaluate(el=>getComputedStyle(el).fontWeight),'700');
    check('bestiary allies and saved players can be added ad hoc at initiative zero without disturbing active combat; allies are bold');

    await page.getByRole('button',{name:'Test player view',exact:true}).click();
    const player=page.locator('.test-player');assert.equal(await player.locator('.mini-colour').count(),2);
    await page.evaluate(()=>{fixture.second.hidden=true;fixture.tracker.update();});assert.equal(await player.locator('.mini-colour').count(),1);
    await page.evaluate(()=>{fixture.plugin.data.showPlayerViewColours=false;fixture.tracker.setData(fixture.plugin.data);});assert.equal(await player.locator('.mini-colour').count(),0);
    check('player-view colours are read-only, respect hidden creatures and have an independent visibility setting');

    await page.evaluate(()=>fixture.tracker.openEffect(fixture.first));
    const handle=panel.getByRole('button',{name:'Move effect panel',exact:true});const before=await panel.boundingBox();await handle.focus();await handle.press('ArrowLeft');
    const after=await panel.boundingBox();assert.equal(Math.round(after.x),Math.round(before.x-20));
    await page.screenshot({path:path.join(out,'effects-wide.png')});
    await page.setViewportSize({width:360,height:500});
    await page.waitForFunction(()=>{const b=document.querySelector('.effect-panel').getBoundingClientRect();return b.x>=0&&b.y>=0&&b.right<=360&&b.bottom<=500;});
    const bounds=await panel.boundingBox();
    assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=360&&bounds.y+bounds.height<=500);
    await page.screenshot({path:path.join(out,'effects-narrow.png')});
    await panel.getByRole('button',{name:'Close effect panel',exact:true}).click();
    check('effect panel can be moved and stays inside a narrow viewport');
}
