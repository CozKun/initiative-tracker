import assert from "node:assert/strict";

export async function runEncounterPersistenceChecks(page, url, check) {
    await page.goto(`${url}?builder`);
    await page.addStyleTag({ content: 'main { width:min(820px, 100%); }' });
    await page.evaluate(() => {
        const {tracker, Creature, builderPlayers, plugin} = fixture;
        builderPlayers.empty();
        tracker.setParty('Test party', plugin);
        tracker.addPrepared(plugin, false, new Creature({ name:'Another active player', player:true }));
    });
    await page.getByLabel('Select a party',{exact:true}).selectOption('Test party');
    await page.locator('.named-player').filter({hasText:'Borin'}).getByRole('checkbox').uncheck();
    await page.getByRole('button',{name:'Save this encounter and its Mini Colour Indicators',exact:true}).click();
    await page.getByRole('dialog').locator('input').fill('Party exclusions');
    await page.getByRole('dialog',{name:'Save encounter'}).getByRole('button',{name:'Save encounter',exact:true}).click();
    await page.getByRole('dialog').waitFor({state:'detached'});
    await page.getByLabel('Select a party',{exact:true}).selectOption('');
    await page.getByRole('button',{name:'Load a saved encounter, replacing the current builder contents',exact:true}).click();
    const library = page.getByRole('dialog',{name:'Load encounter'});
    await library.getByRole('searchbox').fill('party excl');
    await library.getByRole('button',{name:/^Party exclusions /}).click();
    assert.equal(await page.getByLabel('Select a party',{exact:true}).inputValue(),'Test party');
    assert.equal(await page.locator('.named-player').filter({hasText:'Borin'}).getByRole('checkbox').isChecked(),false);
    await page.getByRole('button',{name:'Start this encounter in the initiative tracker',exact:true}).click();
    assert.deepEqual(await page.evaluate(() => fixture.get(fixture.tracker).map(c => [c.name,!!c.player])), [['Aria',true],['Goblin',false]]);
    check('builder restores saved party exclusions and starts with just the selected roster, despite a previously active party');

    await page.evaluate(() => {
        const {plugin, Creature, tracker} = fixture;
        plugin.players.set('Edda', new Creature({name:'Edda',player:true,hp:18,level:3}));
        const lookup = plugin.getPlayerByName;
        plugin.getPlayerByName = (name) => plugin.players.get(name) ?? lookup(name);
        tracker.setData(plugin.data);
    });
    await page.getByLabel('Add a saved player').selectOption('Edda');
    await page.getByRole('button',{name:'Add planning group',exact:true}).click();
    assert.match(await page.locator('.party-count').innerText(),/2 in tracker · 3 for difficulty/);
    await page.getByRole('button',{name:'Start this encounter in the initiative tracker',exact:true}).click();
    assert.deepEqual(await page.evaluate(() => fixture.get(fixture.tracker).filter(c => c.player).map(c => c.name)),['Aria','Edda']);
    await page.getByLabel('Add temporary players to tracker').check();
    await page.getByRole('button',{name:'Start this encounter in the initiative tracker',exact:true}).click();
    assert.deepEqual(await page.evaluate(() => fixture.get(fixture.tracker).filter(c => c.player).map(c => c.name)),['Aria','Edda','Player 1']);
    check('saved players can join a custom roster and planning groups create tracker rows only when opted in');

    const switched = await page.evaluate(() => {
        const {tracker, Creature, plugin, get} = fixture;
        const aria = new Creature({name:'Aria',player:true,hp:21,baseColor:'#AA7733'}, 15);
        aria.hp = 9;
        const outgoing = new Creature({name:'Outgoing',player:true,active:true}, 18);
        tracker.set([outgoing,aria]);
        tracker.state.set(true);
        tracker.setParty('Test party', plugin);
        return get(tracker).map((creature) => [creature.name,creature.hp,creature.initiative,creature.baseColor ?? null,!!creature.active]);
    });
    assert.deepEqual(switched,[['Aria',9,15,'#AA7733',true],['Borin',0,0,null,false]]);
    check('changing the active tracker party preserves returning players’ combat state and hands off its active turn');

    const roster = await page.evaluate(() => {
        const {Creature, tracker, get, plugin} = fixture;
        plugin.getPlayerByName = name => new Creature({name, player:true, id:'laptop-registry-id', baseColor:'#333333'});
        const saved = new Creature({name:'Aria',id:'desktop-roster-id',player:true,hp:20,baseColor:'#FF0000'}).toJSON();
        const duplicate = {...saved,id:'old-random-id'};
        const enemy = new Creature({name:'Aria',id:'same-name-enemy',hp:10,baseColor:'#FFFF00'}).toJSON();
        tracker.new(plugin, {creatures:[saved,duplicate,enemy]}, {useSavedRoster:true,persist:false});
        return get(tracker).map(c => [c.id,c.baseColor,!!c.player]);
    });
    assert.deepEqual(roster,[['desktop-roster-id','#FF0000',true],['same-name-enemy','#FFFF00',false]]);
    const explicit = await page.evaluate(async () => {
        const {plugin, parser, Creature} = fixture;
        plugin.defaultParty = plugin.data.parties[0];
        const empty = await parser.parse({players:[]});
        const unknown = await parser.parse({players:['Aria','Guest']});
        plugin.getCreatureFromBestiary = (name) => new Creature({name,baseColor:'#333333'});
        const [clear] = (await parser.parseRawCreatures([{2:{creature:'Goblin',baseColor:null}}],false)).entries();
        return [empty.players,empty.useSavedRoster,unknown.players,clear[0].baseColor ?? null,clear[1]];
    });
    assert.deepEqual(explicit,[[],true,['Aria','Guest'],null,2]);
    check('saved players retain colour and identity across registries, and encounter blocks preserve explicit empty rosters and cleared colours');

    const group = await page.evaluate(() => {
        const {Creature, get, groupEncounterCreatures, encounter, tracker, plugin} = fixture;
        const ogres = ['#FF0000','#0000FF',undefined].map((baseColor,i) => {
            const ogre = new Creature({name:'Ogre',hp:50,ac:11,modifier:1,baseColor},8+i);
            ogre.hp -= i * 7;
            ogre.current_ac += i;
            return ogre;
        });
        const rows = groupEncounterCreatures(ogres);
        encounter.empty();
        encounter.setMultiple(rows);
        encounter.add({name:'Ogre',hp:50,ac:11,modifier:1});
        const contents = [...get(encounter)].map(([row,count]) => [count, row.hp, row.miniColours]);
        plugin.data.condense = true;
        let roll = 10;
        plugin.getInitiativeValue = () => ++roll;
        ogres[0].hidden = true;
        const differentMod = new Creature({name:'Ogre',hp:50,modifier:2});
        const ally = new Creature({name:'Ogre',hp:50,modifier:1,friendly:true});
        tracker.set([...ogres,differentMod,ally]);
        tracker.roll(plugin);
        return {contents, initiative:get(tracker).map(c => c.initiative), colours:ogres.map(c=>c.baseColor ?? null)};
    });
    assert.deepEqual(group,{contents:[[4,50,['#FF0000','#0000FF',null,null]]],initiative:[11,11,11,12,13],colours:['#FF0000','#0000FF',null]});
    check('differently coloured and damaged copies regroup in the builder and share initiative in combat, while other modifiers and allies stay separate');

    const sync = await page.evaluate(async () => {
        const {Creature, plugin, SyncedSettings, tracker, get} = fixture;
        const encounter = (name, baseColor) => ({name, creatures:[new Creature({name:'Goblin',baseColor}).toJSON()]});
        let disk = structuredClone({ ...plugin.data, encounters:{Keep:encounter('Keep','#999999'),Clear:encounter('Clear','#111111')} });
        let local = structuredClone(disk);
        const session = new SyncedSettings(local, {
            current: () => local, read: async () => structuredClone(disk),
            apply: next => { local = next; }, write: async next => { disk = structuredClone(next); }
        });
        // The desktop arrives on disk while the laptop still holds its old settings in memory.
        disk.encounters.Desktop = encounter('Desktop','#123456');
        disk.encounters.Clear.creatures[0].baseColor = undefined;
        local.encounters.Laptop = encounter('Laptop','#ABCDEF');
        local.showBaseColorColumn = false;
        await session.reconcile(true);
        disk.encounters.Desktop.creatures[0].baseColor = '#654321';
        delete disk.encounters.Keep;
        await session.reconcile(false);
        tracker.new(plugin, local.encounters.Desktop, {useSavedRoster:true,persist:false});
        return {setting:disk.showBaseColorColumn,names:Object.keys(local.encounters).sort(),
            desktop:get(tracker)[0].baseColor,laptop:local.encounters.Laptop.creatures[0].baseColor,
            cleared:local.encounters.Clear.creatures[0].baseColor ?? null};
    });
    assert.deepEqual(sync,{setting:false,names:['Clear','Desktop','Laptop'],desktop:'#654321',laptop:'#ABCDEF',cleared:null});
    check('external saves refresh an open session and survive unrelated writes, including colour changes, clears and encounter deletions');
}
