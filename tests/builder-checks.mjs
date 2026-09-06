import assert from "node:assert/strict";
import path from "node:path";

export async function runBuilderChecks(page, url, out, check) {
    await page.setViewportSize({width: 920, height: 850});
    await page.goto(`${url}?builder`);
    await page.addStyleTag({content: 'main { width:min(820px, 100%); } h5 { font-size:14px; }'});
    const colours = () => page.evaluate(() => [...fixture.get(fixture.encounter)].flatMap(([row]) => row.miniColours));
    const colourButton = index => page.getByRole('button', {name:`Mini Colour Indicator: Goblin ${index}`, exact:true});
    const setColour = async (index, value) => {
        await colourButton(index).click();
        await page.getByLabel('Hex colour', {exact:true}).fill(value);
        await page.getByRole('button', {name:'Apply colour',exact:true}).click();
    };
    const partyPanel = page.locator('.party-panel');
    assert.equal(await partyPanel.getAttribute('open'),'');
    assert.equal(await page.evaluate(() => fixture.plugin.data.builder.showParty),true);
    await page.reload();
    assert.equal(await partyPanel.getAttribute('open'),'');
    await partyPanel.locator('summary').click();
    await page.waitForFunction(() => fixture.plugin.data.builder.showParty === false);
    await page.reload();
    assert.equal(await partyPanel.getAttribute('open'),null);
    await partyPanel.locator('summary').click();
    await page.waitForFunction(() => fixture.plugin.data.builder.showParty === true);
    await page.reload();
    assert.equal(await partyPanel.getAttribute('open'),'');
    await page.addStyleTag({content: 'main { width:min(820px, 100%); } h5 { font-size:14px; }'});
    check('party initialisation does not invert its setting; explicit collapse and expand survive reopening');

    await page.getByLabel('Select a party',{exact:true}).selectOption('Test party');
    assert.equal(await page.locator('.named-player').count(),2);
    assert.match(await page.locator('.party-count').innerText(),/6 included/);
    await page.locator('.named-player').filter({hasText:'Aria'}).getByRole('checkbox').uncheck();
    assert.match(await page.locator('.party-count').innerText(),/5 included/);
    await page.getByLabel('Select a party',{exact:true}).selectOption('');
    assert.equal(await page.locator('.named-player').count(),0);
    assert.match(await page.locator('.party-count').innerText(),/4 included/);
    check('saved party selection and individual inclusion controls retain unnamed player groups');

    const bestiary = page.locator('.bestiary-test-table');
    const xpCells = () => bestiary.locator('.creature-xp').allTextContents().then(values => values.map(value => value.trim()));
    assert.equal(await bestiary.getByRole('button',{name:'XP',exact:true}).count(),1);
    assert.deepEqual(await xpCells(),['50','0','450']);
    await bestiary.getByRole('button',{name:'XP',exact:true}).click();
    assert.deepEqual(await xpCells(),['0','50','450']);
    await bestiary.getByRole('button',{name:'XP',exact:true}).click();
    assert.deepEqual(await xpCells(),['450','50','0']);
    assert.equal(await page.evaluate(() => {
        const data = structuredClone(fixture.plugin.data);
        data.builder.headers = [{text:'Custom',field:'type',type:0},{text:'CR',field:'cr',type:1}];
        delete data.builder.xpColumnAdded;
        const plugin = {...fixture.plugin,data,saveSettings() {}};
        const first = fixture.createTable(plugin,[]);
        if (fixture.get(first).map(h => h.text).join() !== 'Custom,CR,XP') return false;
        first.setHeadersFromState(data.builder.headers.filter(h => h.field !== 'xp'));
        return fixture.get(fixture.createTable(plugin,[])).every(h => h.field !== 'xp');
    }),true);
    check('bestiary XP uses explicit values, preserves zero, falls back to CR, sorts numerically and preserves custom headers');
    await page.getByRole('button',{name:'Add Goblin from bestiary',exact:true}).click();
    await page.getByRole('button',{name:'Add another Goblin',exact:true}).click();
    assert.equal(await page.locator('.encounter-creature-card').count(),1);
    assert.equal(await page.locator('.creature-copy').count(),3);
    assert.equal(await page.getByLabel('Number of Goblin',{exact:true}).inputValue(),'3');
    assert.match(await page.locator('.party-context').innerText(),/4 enabled players/);
    assert.match(await page.locator('.difficulty-band[data-tier=Low]').getAttribute('aria-description'),/200 to below 300 XP/);
    assert.match(await page.locator('.difficulty-caption').innerText(),/Trivial\s+150 XP/);
    assert.match(await page.locator('.stats').innerText(),/50 XP each\s+·\s+150 XP total/);
    check('builder adds nested copies and counts all four unnamed players in party budgets');

    await colourButton(1).click();
    await page.getByRole('button',{name:'Use recent colour #123ABC',exact:true}).waitFor();
    await page.getByRole('button',{name:'Cancel',exact:true}).click();
    for (const [index,colour] of [[1,'#FF0000'],[2,'#0000FF'],[3,'#00FF00']]) await setColour(index,colour);
    assert.deepEqual(await colours(),['#FF0000','#0000FF','#00FF00']);
    await page.getByRole('button',{name:'Remove Goblin 2',exact:true}).click();
    assert.deepEqual(await colours(),['#FF0000','#00FF00']);
    assert.equal((await page.locator('.group-total').innerText()).trim(),'100 XP total');
    await page.getByRole('button',{name:'Add Goblin from bestiary',exact:true}).click();
    assert.deepEqual(await colours(),['#FF0000','#00FF00',null]);
    assert.equal(await page.locator('.encounter-creature-card').count(),1);
    check('individual colour pickers share recent history; removing a middle copy preserves its neighbours');

    await colourButton(2).click(); await page.getByRole('button',{name:'No colour',exact:true}).click();
    assert.deepEqual(await colours(),['#FF0000',null,null]);
    await setColour(2,'#0000FF');
    await page.getByRole('button',{name:'Hide Goblin from player view',exact:true}).click();
    assert.match(await page.locator('.difficulty-caption').innerText(),/150 XP/);
    await page.getByRole('button',{name:'Make Goblin an ally',exact:true}).click();
    assert.match(await page.locator('.difficulty-caption').innerText(),/0 XP/);
    assert.equal((await page.locator('.group-total').innerText()).trim(),'150 XP total');
    assert.match(await page.locator('.group-total').getAttribute('aria-description'),/Allies are excluded/);
    assert.match(await page.locator('.party-context').innerText(),/3 allied creatures excluded/);
    assert.deepEqual(await page.evaluate(() => fixture.catalogueGoblin),{name:'Goblin',hp:30,ac:14,cr:'1/4',xp:50});
    await page.getByRole('button',{name:'Make Goblin an enemy',exact:true}).click();
    check('clearing colours works; hidden enemies count, allies do not, and bestiary data stays unchanged');

    await page.getByRole('button',{name:'Save this encounter and its Mini Colour Indicators',exact:true}).click();
    await page.getByRole('dialog').locator('input').fill('Colour test');
    await page.getByRole('button',{name:'Save',exact:true}).click();
    const saved = await page.evaluate(() => fixture.plugin.data.encounters['Colour test'].creatures);
    assert.deepEqual(saved.filter(c => !c.player).map(c => c.baseColor ?? null),['#FF0000','#0000FF',null]);
    assert.equal(saved.filter(c => c.player).length,4);
    assert.equal(new Set(saved.map(c => c.id)).size,7);
    await page.getByRole('button',{name:'Clear the encounter creatures; keep the selected party',exact:true}).click();
    await page.getByRole('button',{name:'Load a saved encounter, replacing the current builder contents',exact:true}).click();
    await page.evaluate(() => window.lastMenu.find(item => item.title === 'Colour test').action());
    assert.equal(await page.locator('.encounter-creature-card').count(),1);
    assert.equal(await page.locator('.creature-copy').count(),3);
    assert.deepEqual(await colours(),['#FF0000','#0000FF',null]);
    assert.match(await page.locator('.party-context').innerText(),/4 enabled players/);
    check('saving and loading restores nested groups, individual colours, unique IDs and all players');

    await page.evaluate(() => { navigator.clipboard.writeText = async value => { window.copiedEncounter = value; }; });
    await page.getByRole('button',{name:'Copy an encounter block, including Mini Colour Indicators, to paste into a note',exact:true}).click();
    const parsed = await page.evaluate(async () => {
        const raw = JSON.parse(window.copiedEncounter.replace(/^```encounter\n|```$/g,''));
        return [...await fixture.parser.parseRawCreatures(raw.creatures,false)]
            .map(([creature,count]) => ({colour:creature.baseColor ?? null,count,hidden:creature.hidden}));
    });
    assert.deepEqual(parsed,[{colour:'#FF0000',count:1,hidden:true},{colour:'#0000FF',count:1,hidden:true},{colour:null,count:1,hidden:true}]);
    check('copied encounter blocks round-trip through the parser without merging different colours');

    await page.getByRole('button',{name:'Start this encounter in the initiative tracker',exact:true}).click();
    const started = await page.evaluate(() => fixture.get(fixture.tracker).map(c => ({colour:c.baseColor ?? null,player:c.player,hidden:c.hidden})));
    assert.deepEqual(started.filter(c => !c.player).map(c => c.colour),['#FF0000','#0000FF',null]);
    assert.equal(started.filter(c => c.player).length,4);
    check('starting the actual tracker preserves each copy and its Mini Colour Indicator');

    await page.evaluate(() => {
        const state = JSON.parse(JSON.stringify([...fixture.get(fixture.encounter)]));
        fixture.encounter.empty(); fixture.encounter.setMultiple(state);
    });
    assert.deepEqual(await colours(),['#FF0000','#0000FF',null]);
    const quantity = page.getByLabel('Number of Goblin',{exact:true});
    await quantity.fill('2'); await quantity.press('Tab');
    assert.deepEqual(await colours(),['#FF0000','#0000FF']);
    await quantity.fill('3'); await quantity.press('Tab');
    assert.deepEqual(await colours(),['#FF0000','#0000FF',null]);
    for (const invalid of ['', '0', '-1', '1.5']) {
        await quantity.fill(invalid); await quantity.press('Tab');
        assert.equal(await quantity.inputValue(),'3');
        assert.deepEqual(await colours(),['#FF0000','#0000FF',null]);
    }
    check('workspace restoration and quantity changes retain the appropriate individual colours');

    await page.evaluate(() => { fixture.builderPlayers.empty(); fixture.builderPlayers.add({isPlayer:false,enabled:true,count:4,level:1}); });
    await page.getByLabel('Number of players in group 1',{exact:true}).fill('2');
    assert.match(await page.locator('.difficulty-band[data-tier=Low]').getAttribute('aria-description'),/100 to below 150 XP/);
    assert.equal(await page.locator('.difficulty-caption strong').innerText(),'Moderate');
    await page.getByLabel('Level of player group 1',{exact:true}).fill('');
    assert.equal(await page.locator('.difficulty-caption strong').innerText(),'Add party levels');
    await page.getByLabel('Level of player group 1',{exact:true}).fill('1');
    await page.getByLabel('Number of players in group 1',{exact:true}).fill('4');
    await page.getByLabel('Exclude from encounter difficulty',{exact:true}).click();
    assert.equal(await page.locator('.difficulty-caption strong').innerText(),'Add party levels');
    await page.getByLabel('Include in encounter difficulty',{exact:true}).click();
    assert.equal(await page.locator('.difficulty-caption strong').innerText(),'Trivial');
    await page.locator('.builder-difficulty summary').click();
    assert.equal(await page.locator('.difficulty-bands').isVisible(),true);
    assert.equal(await page.locator('.difficulty-distance').isVisible(),true);
    assert.equal(await page.locator('.next-bracket').innerText(),'50 XP to Low');
    await page.locator('.builder-difficulty summary').click();
    check('budgets react to quantities, level edits and disabled players; collapsing details keeps the gauge visible');

    await page.getByLabel('Select a party',{exact:true}).selectOption('Test party');
    const addCopy = page.getByRole('button',{name:'Add another Goblin',exact:true});
    await addCopy.hover();
    const tooltip = page.getByRole('tooltip');
    await tooltip.waitFor();
    assert.match(await tooltip.getAttribute('class'),/coz-initiative-tooltip/);
    assert.match(await tooltip.innerText(),/Mini Colour Indicator/);
    assert.equal(await addCopy.getAttribute('title'),null);
    assert.equal(await page.locator('.builder-fixture [title]').count(),0);
    assert.equal(await page.getByRole('button',{name:'Start this encounter in the initiative tracker',exact:true}).getAttribute('data-tooltip-classes'),'coz-initiative-tooltip');
    const styled = await tooltip.evaluate(el => ({background:getComputedStyle(el).backgroundColor,text:getComputedStyle(el).color}));
    assert.deepEqual(styled,{background:'rgb(41, 43, 50)',text:'rgb(229, 230, 236)'});
    await page.screenshot({path:path.join(out,'builder-tooltip-dark.png')});
    await page.mouse.move(0,0);
    check('builder tooltips share the native host styling without browser titles or losing accessible action names');
    await page.locator('.builder-fixture').screenshot({path:path.join(out,'builder-nested.png')});
    await page.addStyleTag({content: ':root { --background-primary:#ece4d3; --background-secondary:#e4dbc8; --text-normal:#372e28; --text-muted:#675b4d; --text-faint:#aaa294; --background-modifier-border:#c4bba7; } body {background:#ece4d3;color:#372e28} button,input {color:inherit;background:var(--background-secondary)}'});
    await page.setViewportSize({width:390,height:800});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
    await colourButton(3).click();
    const bounds = await page.getByRole('dialog',{name:'Mini Colour Indicator picker'}).boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390 && bounds.y >= 0 && bounds.y + bounds.height <= 800);
    await page.screenshot({path:path.join(out,'builder-narrow-picker.png')});
    await page.getByLabel('Hex colour',{exact:true}).press('Escape');
    await addCopy.hover();
    await tooltip.waitFor();
    assert.deepEqual(await tooltip.evaluate(el => ({background:getComputedStyle(el).backgroundColor,text:getComputedStyle(el).color})),
        {background:'rgb(228, 219, 200)',text:'rgb(55, 46, 40)'});
    await page.screenshot({path:path.join(out,'builder-tooltip-light.png')});
    check('nested builder and its colour picker fit a narrow pane in the light theme');
}
