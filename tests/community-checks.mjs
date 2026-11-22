import assert from 'node:assert/strict';
import path from 'node:path';
async function enterNumber(page, surface, label, keys) {
    await surface.getByRole('button',{name:label,exact:true}).tap();
    const editor=page.getByRole('dialog',{name:label,exact:true});
    assert.equal(await editor.locator('input,textarea').count(),0);
    for (const key of keys) await editor.getByRole('button',{name:key,exact:true}).tap();
    await editor.getByRole('button',{name:'Set',exact:true}).tap();
    await editor.waitFor({state:'detached'});
}
export async function runCommunityChecks(page, browser, url, out, check) {
    await page.goto(url+'?builder');
    const systems=['dnd5e','dnd5e-55','dnd5e-lazygm','dnd5e-cr2-simple','dnd5e-flee-mortals','pathfinder2e'];
    for(const system of systems) {
        const result=await page.evaluate(system=>{
            const {plugin,tracker,getRpgSystem,encounter,builderPlayers,systemDifficultyScale}=fixture;
            plugin.data.rpgSystem=system;tracker.setData(plugin.data);
            encounter.empty();encounter.add({name:'Test native creature',hp:30,ac:14,cr:2,level:5,xp:450});
            builderPlayers.empty();builderPlayers.add({isPlayer:false,enabled:true,count:4,level:5});
            const calculator=getRpgSystem(plugin);
            const thresholds=calculator.getDifficultyThresholds([5,5,5,5]);
            const difficulty=calculator.getEncounterDifficulty(new Map([[{name:'Test native creature',cr:2,level:5,xp:450},1]]),[5,5,5,5]);
            const problems=[];
            for(const level of [1,5,10,20]) {
                const tiers=calculator.getDifficultyThresholds([level,level,level,level]);
                for(const tier of tiers.filter(t=>t.minValue>0)) {
                    for(const delta of [-0.001,0,0.001]) {
                        const v=tier.minValue+delta;
                        const first=system==='dnd5e' ? 'Trivial' : calculator.systemDifficulties[0];
                        const scale=systemDifficultyScale(v,tiers,first);
                        const expected=[...tiers].reverse().find(t=>t.exclusive ? v>t.minValue : v>=t.minValue)?.displayName ?? first;
                        if(!scale || scale.current.name!==expected || scale.position<0 || scale.position>100) problems.push({level,v,expected,actual:scale?.current.name});
                    }
                }
            }
            return {unit:calculator.valueUnit,value:difficulty.value,thresholds,problems};
        },system);
        assert.deepEqual(result.problems,[],system);
        assert.equal(await page.locator('.difficulty-bands').count(),1,system);
        assert.ok((await page.locator('.difficulty-caption').innerText()).includes(result.unit));
        assert.ok(!(await page.locator('.difficulty-caption').innerText()).includes('NaN'));
        assert.equal(await page.locator('.encounter-creature-card').count(),1);
        const expectedValues={'dnd5e':450,'dnd5e-55':450,'dnd5e-lazygm':2,'dnd5e-cr2-simple':28,'dnd5e-flee-mortals':2,'pathfinder2e':40};
        assert.equal(result.value,expectedValues[system]);
        await page.getByRole('button',{name:'Calculation details',exact:true}).click();
        assert.ok((await page.locator('.difficulty-calculation').innerText()).includes('Encounter is'));
        await page.getByRole('button',{name:'Calculation details',exact:true}).click();
        await page.screenshot({path:path.join(out,`system-${system}.png`)});
        check(`${system}: live switching, units, reference fixture and band boundaries across levels 1/5/10/20`);
    }
    const fractions=await page.evaluate(()=>{
        const calc=fixture.getRpgSystem(fixture.plugin,'dnd5e-cr2-simple');
        return ['1/8',0.125,'1/4',0.25,'1/2',0.5].map(cr=>calc.getCreatureDifficulty({cr}));
    });
    assert.deepEqual(fractions,[5,5,10,10,16,16]);
    await page.evaluate(()=>{fixture.encounter.empty();fixture.encounter.add({name:'Unsupported level',level:30,cr:30,hp:1});});
    assert.match(await page.locator('.difficulty-caption').innerText(),/Difficulty unavailable/);
    assert.equal(await page.locator('.difficulty-bands').count(),0);
    check('fractional CR matches decimal CR; unsupported PF2e levels show unavailable instead of zero difficulty');

    const edgeCases=await page.evaluate(()=>{
        const {getRpgSystem,plugin,Creature,tracker,get}=fixture;
        const pf=getRpgSystem(plugin,'pathfinder2e'), lazy=getRpgSystem(plugin,'dnd5e-lazygm');
        const low=n=>pf.getDifficultyThresholds(Array(n).fill(5)).find(t=>t.displayName==='Low').minValue;
        const original=plugin.getCreatureFromBestiary;
        plugin.getCreatureFromBestiary=()=>({name:'Fallback',cr:2,level:5,xp:450});
        const zeroXp=getRpgSystem(plugin,'dnd5e').getCreatureDifficulty({name:'Fallback',xp:0,cr:2});
        const zeroLevel=pf.getCreatureDifficulty({name:'Fallback',level:0},[1,1,1,1]);
        const fallback=getRpgSystem(plugin,'dnd5e-cr2-simple').getCreatureDifficulty({name:'Fallback'});
        plugin.getCreatureFromBestiary=original;
        const at=lazy.getEncounterDifficulty(new Map([[{cr:10},1]]),[5,5,5,5]).displayName;
        const above=lazy.getEncounterDifficulty(new Map([[{cr:10.125},1]]),[5,5,5,5]).displayName;
        const flee=getRpgSystem(plugin,'dnd5e-flee-mortals');
        const minion={name:'Minion',hp:1,cr:1,traits:[{name:'Minion'}]};
        plugin.data.rpgSystem='dnd5e-flee-mortals';tracker.setData(plugin.data);
        tracker.set([...Array.from({length:4},()=>new Creature({name:'Hero',player:true,level:5})),
            ...Array.from({length:5},(_,i)=>new Creature({...minion,baseColor:['#FF0000','#0000FF'][i%2]}))]);
        const budget=get(tracker.difficulty(plugin)).difficulty.value;
        const unsupported=flee.getGroupDifficulty({...minion,cr:'unknown'},5,[]);
        return {low:[low(2),low(3),low(4),low(6)],zeroXp,zeroLevel,fallback,at,above,budget,
            group:flee.getGroupDifficulty(minion,5,[]),unsupported:Number.isNaN(unsupported)};
    });
    assert.deepEqual(edgeCases,{low:[20,40,60,100],zeroXp:0,zeroLevel:30,fallback:28,at:'Not Deadly',above:'Deadly',budget:1,group:1,unsupported:true});
    check('PF2e published party adjustments, zero values, bestiary fallback, Lazy GM strict boundary and coloured minion budgets');
    await page.evaluate(()=>{
        fixture.plugin.data.rpgSystem='dnd5e-flee-mortals';fixture.tracker.setData(fixture.plugin.data);
        fixture.encounter.empty();fixture.encounter.add({name:'Over cap',cr:9,hp:30});
    });
    assert.match(await page.locator('.difficulty-override').innerText(),/Exceeds CR cap/);
    assert.equal(await page.locator('.difficulty-distance').count(),0);
    check('Flee Mortals CR-cap override stays visible and suppresses misleading next-tier advice');

    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
    const touch=await context.newPage();touch.setDefaultTimeout(6000);
    const errors=[];touch.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
    await touch.goto(url);
    // Test host dimensions only; plugin controls still use their actual styles.
    await touch.addStyleTag({content:'body{margin:8px} main{width:100%;max-width:100%}'});
    await touch.getByRole('button',{name:'Actions for Goblin 1',exact:true}).tap();
    assert.ok(await touch.evaluate(()=>lastMenu.some(i=>i.title==='Apply effect…')));
    await touch.evaluate(()=>lastMenu.find(i=>i.title==='Apply effect…').action());
    const panel=touch.getByRole('dialog',{name:'Apply effect',exact:true});
    await panel.getByRole('button',{name:'Heal',exact:true}).tap();
    await enterNumber(touch,panel,'Heal each target for',['4']);
    assert.equal(await panel.locator('tbody tr').evaluate(el=>getComputedStyle(el).display),'grid');
    const sizes=await panel.getByRole('button',{name:'Apply',exact:true}).boundingBox();assert.ok(sizes.height>=44);
    // Deterministic visualViewport keyboard simulation exercises resize/scroll listeners.
    await touch.evaluate(()=>{
        const viewport=new EventTarget();Object.assign(viewport,{width:390,height:360,offsetLeft:0,offsetTop:120});
        Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});
        window.dispatchEvent(new Event('resize'));viewport.dispatchEvent(new Event('resize'));
    });
    await touch.waitForFunction(() => document.querySelector('.effect-panel').getBoundingClientRect().bottom <= 472);
    const field=await panel.getByRole('button',{name:'Heal each target for',exact:true}).boundingBox();
    const footer=await panel.locator('footer').boundingBox();
    assert.ok(field.y+field.height<=footer.y,JSON.stringify({field,footer}));
    let box=await panel.boundingBox();assert.ok(box.y>=128 && box.y+box.height<=472,JSON.stringify(box));
    await panel.getByRole('button',{name:'Apply',exact:true}).scrollIntoViewIfNeeded();
    const apply=await panel.getByRole('button',{name:'Apply',exact:true}).boundingBox();assert.ok(apply.y>=120&&apply.y+apply.height<=480);
    await touch.screenshot({path:path.join(out,'touch-effect-keyboard.png')});
    await panel.getByRole('button',{name:'Cancel',exact:true}).tap();
    await touch.getByRole('button',{name:'Adjust health: Goblin 1',exact:true}).tap();
    const health=touch.getByRole('dialog',{name:'Health: Goblin 1',exact:true});
    box=await health.boundingBox();assert.ok(box.y>=128&&box.y+box.height<=472);
    await health.getByRole('button',{name:'7',exact:true}).tap();
    await health.locator('button[type=submit]').tap();
    assert.equal(await touch.evaluate(()=>fixture.first.hp),23);
    await touch.evaluate(()=>{fixture.tracker.openEffect(fixture.first);});
    await touch.setViewportSize({width:844,height:390});
    await touch.evaluate(()=>{Object.assign(window.visualViewport,{width:844,height:390,offsetTop:0});window.visualViewport.dispatchEvent(new Event('resize'));});
    await touch.waitForFunction(()=>{const b=document.querySelector('.effect-panel').getBoundingClientRect();return b.x>=8&&b.right<=836&&b.bottom<=382;});
    box=await panel.boundingBox();assert.ok(box.x>=8&&box.x+box.width<=836&&box.y+box.height<=382,JSON.stringify(box));
    await touch.setViewportSize({width:1024,height:768});
    await enterNumber(touch,panel,'Damage per target',['8']);
    await enterNumber(touch,panel,'HP multiplier for Goblin 1',['0','Decimal point','5']);
    await panel.getByRole('button',{name:'Choose condition',exact:true}).tap();
    assert.equal(await panel.locator('input[list]').count(),0);
    await panel.getByRole('group',{name:'Available conditions'}).getByRole('button',{name:'Blinded',exact:true}).tap();
    await panel.getByRole('button',{name:'Custom condition',exact:true}).tap();
    await panel.getByLabel('Condition',{exact:true}).focus();
    await touch.evaluate(()=>{
        Object.assign(window.visualViewport,{width:1024,height:280,offsetTop:48});
        window.visualViewport.dispatchEvent(new Event('resize'));
        window.visualViewport.dispatchEvent(new Event('scroll'));
    });
    await touch.waitForFunction(()=>{
        const detail=document.querySelector('.effect-panel').getBoundingClientRect();
        const footer=document.querySelector('.effect-panel footer').getBoundingClientRect();
        const input=document.activeElement.getBoundingClientRect();
        return detail.top>=56 && detail.bottom<=320 && footer.bottom<=320 && input.bottom<=footer.top;
    });
    await touch.screenshot({path:path.join(out,'tablet-effect-keyboard.png')});
    await panel.getByRole('button',{name:'Statblocks',exact:true}).tap();
    await panel.getByText('Statblock for Goblin 1',{exact:true}).waitFor();
    await panel.getByRole('button',{name:'Back to effect',exact:true}).tap();
    assert.equal(await panel.getByRole('button',{name:'Damage per target',exact:true}).innerText(),'8');
    await panel.getByRole('button',{name:'Apply',exact:true}).tap();
    assert.deepEqual(await touch.evaluate(()=>[fixture.first.hp,[...fixture.first.status].map(s=>s.name)]),[19,['Blinded']]);
    check('touch actions, 44px Apply, phone rotation and tablet keyboard with viewport-only events and in-place statblocks');

    await touch.evaluate(()=>fixture.tracker.openEffect(fixture.first,false,'ac'));
    await enterNumber(touch,panel,'Set AC, or use +/− to adjust',['Plus sign','2']);
    await panel.getByRole('button',{name:'Apply',exact:true}).tap();
    assert.equal(await touch.evaluate(()=>Number(fixture.first.current_ac)),16);
    check('touch condition selection and number entry preserve decimal multipliers and signed AC changes');

    await touch.evaluate(()=>{
        Object.assign(window.visualViewport,{width:1024,height:768,offsetTop:0});
        window.visualViewport.dispatchEvent(new Event('resize'));
    });
    await touch.getByRole('button',{name:'Save',exact:true}).tap();
    const save=touch.getByRole('dialog',{name:'Save encounter',exact:true});
    const saveBox=await save.boundingBox();
    assert.ok(saveBox.y>=8 && saveBox.y<100 && Math.abs(saveBox.x+saveBox.width/2-512)<2);
    await save.getByLabel('Encounter name').fill('Tablet save');
    await touch.evaluate(()=>{
        Object.assign(window.visualViewport,{width:1024,height:240,offsetTop:12});
        window.visualViewport.dispatchEvent(new Event('resize'));
    });
    await touch.waitForFunction(()=>document.querySelector('.library-panel footer').getBoundingClientRect().bottom<=244);
    await save.getByRole('button',{name:'Save encounter',exact:true}).tap();
    assert.ok(await touch.evaluate(()=>fixture.plugin.data.encounters['Tablet save']));
    check('tablet save opens near the top and its submit button fits above the software keyboard');

    await touch.setViewportSize({width:1280,height:960});
    await touch.goto(url+'?tracker-drawer');
    await touch.addStyleTag({content:'main { width:440px; max-width:calc(100% - 32px); height:630px; margin:0; padding:12px; box-sizing:border-box; position:fixed; top:55px; right:16px; overflow:auto; }'});
    const longName='Clockwork Commander of the Southern Watch';
    await touch.evaluate((longName)=>{
        const {Creature,tracker}=fixture;
        const guards=Array.from({length:9},(_,i)=>new Creature({name:`Guard ${i+1}`,hp:30,ac:16,baseColor:'#2299DD'},20-i));
        const commander=new Creature({name:longName,hp:30,ac:16,friendly:true,baseColor:'#E78822'},2);
        tracker.set([...guards,commander]);
        window.tabletCommander=commander;
    },longName);
    const openStatblock=touch.getByRole('button',{name:`Open statblock: ${longName}`,exact:true});
    const rowMenu=touch.getByRole('button',{name:`Actions for ${longName}`,exact:true});
    const adjust=touch.getByRole('button',{name:`Adjust health: ${longName}`,exact:true});
    await adjust.scrollIntoViewIfNeeded();
    const nameBox=await openStatblock.boundingBox(), menuBox=await rowMenu.boundingBox(), hpBox=await adjust.boundingBox();
    assert.ok(nameBox.x+nameBox.width<=menuBox.x && menuBox.x+menuBox.width<=hpBox.x,JSON.stringify({nameBox,menuBox,hpBox}));
    assert.ok(Math.abs((nameBox.y+nameBox.height/2)-(menuBox.y+menuBox.height/2))<2);
    assert.ok(menuBox.width>=44 && menuBox.height>=44);
    assert.ok(await openStatblock.evaluate(node=>parseFloat(getComputedStyle(node).fontSize)>=14 && node.scrollWidth<=node.clientWidth));
    assert.equal(await openStatblock.evaluate(node=>getComputedStyle(node).textAlign),'left');
    await openStatblock.tap();
    assert.ok(await touch.evaluate(()=>window.openedCombatant===window.tabletCommander.id));
    check('tablet tracker drawer keeps long names, statblock links and row menus in a single readable group');

    await enterNumber(touch,touch,`Initiative: ${longName}`,['Minus sign','2','Decimal point','5']);
    assert.equal(await touch.evaluate(()=>window.tabletCommander.initiative),-2.5);
    await enterNumber(touch,touch,`Initiative: ${longName}`,['0']);
    assert.equal(await touch.evaluate(()=>window.tabletCommander.initiative),0);

    await adjust.tap();
    const tabletHealth=touch.getByRole('dialog',{name:`Health: ${longName}`,exact:true});
    assert.equal(await tabletHealth.locator('input,textarea,[contenteditable=true]').count(),0);
    assert.ok(await tabletHealth.evaluate(node=>document.activeElement===node));
    await tabletHealth.getByRole('button',{name:'1',exact:true}).tap();
    await tabletHealth.getByRole('button',{name:'8',exact:true}).tap();
    await tabletHealth.getByRole('button',{name:'Delete last digit',exact:true}).tap();
    await tabletHealth.getByRole('button',{name:'2',exact:true}).tap();
    assert.equal(await tabletHealth.getByRole('status',{name:'Damage amount'}).innerText(),'12');
    await touch.screenshot({path:path.join(out,'tablet-drawer-quick-health.png')});
    await tabletHealth.locator('button[type=submit]').tap();
    assert.equal(await touch.evaluate(()=>window.tabletCommander.hp),18);
    await adjust.tap();
    await tabletHealth.getByRole('button',{name:'Heal',exact:true}).first().tap();
    await tabletHealth.getByRole('button',{name:'4',exact:true}).tap();
    await tabletHealth.locator('button[type=submit]').tap();
    assert.equal(await touch.evaluate(()=>window.tabletCommander.hp),22);
    await touch.getByRole('button',{name:'Add',exact:true}).tap();
    const add=touch.locator('.coz-add-combatant');
    await add.getByLabel('Name',{exact:true}).fill('Tablet recruit');
    await enterNumber(touch,add,'HP',['8']);
    await enterNumber(touch,add,'Quantity',['2']);
    await enterNumber(touch,add,'Initiative',['0']);
    await add.getByRole('button',{name:'Add to encounter',exact:true}).tap();
    assert.deepEqual(await touch.evaluate(()=>fixture.get(fixture.tracker).filter(c=>c.name==='Tablet recruit').map(c=>[c.hp,c.initiative])),[[8,0],[8,0]]);
    assert.deepEqual(errors,[]);await context.close();
    check('tablet keypad handles lower-row quick HP, signed decimal initiative and adding two combatants with fixed numeric values');

    await page.goto(url+'?tracker-drawer');
    const desktopName=page.getByRole('button',{name:'Open statblock: Goblin 1',exact:true});
    assert.equal(await page.getByRole('button',{name:'Actions for Goblin 1',exact:true}).count(),0);
    await desktopName.click({button:'right'});
    assert.ok(await page.evaluate(()=>lastMenu.some(item=>item.title==='Apply effect…')));
    await page.evaluate(()=>window.lastMenu=[]);
    await desktopName.press('Shift+F10');
    assert.ok(await page.evaluate(()=>lastMenu.some(item=>item.title==='Apply effect…')));
    check('desktop uses right-click or Shift+F10 for actions and leaves row controls usable with drag locked');
}
