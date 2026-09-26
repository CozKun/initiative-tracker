<script lang="ts">
    import AddCombatant from "../src/tracker/ui/create/AddCombatant.svelte";
    import SaveEncounter from "../src/tracker/ui/SaveEncounter.svelte";
    import PlayerView from "../src/tracker/player/PlayerView.svelte";
    import { sharesInitiative } from "../src/utils/shared-initiative";
    import { setContext } from "svelte";
    import { get, readable } from "svelte/store";
    import { tracker } from "../src/tracker/stores/tracker";
    import { Creature } from "../src/utils/creature";
    import { DEFAULT_SETTINGS } from "../src/utils/constants";
    import { recentColours } from "../src/utils/recent-colours";
    import CreatureRow from "../src/tracker/ui/creatures/Creature.svelte";
    import QuickHealth from "../src/tracker/ui/QuickHealth.svelte";
    import Updating from "../src/tracker/ui/Updating.svelte";
    import Metadata from "../src/tracker/ui/Metadata.svelte";
    import { dnd55DifficultyScale, systemDifficultyScale } from "../src/utils/difficulty-scale";
    import { getRpgSystem } from "../src/utils/rpg-system";
    import { showCreatureMenu } from "../src/tracker/ui/creatures/creature-menu";
    import BuilderEncounter from "../src/builder/view/encounter/Encounter.svelte";
    import PartyExperience from "../src/builder/view/party/PartyExperience.svelte";
    import { encounter } from "../src/builder/stores/encounter";
    import { players as builderPlayers } from "../src/builder/stores/players";
    import { expandEncounter, groupEncounterCreatures, encounterBlockCreatures } from "../src/builder/encounter-creatures";
    import { EncounterParser } from "../src/encounter";
    import { createTable } from "../src/builder/stores/table/table";
    import BestiaryCreature from "../src/builder/view/creatures/Creature.svelte";

    const { quickHealth, updateSession, updating } = tracker;
    const saved = JSON.parse(localStorage.getItem("beta-fixture") ?? "null");
    const plugin: any = {
        data: { ...structuredClone(DEFAULT_SETTINGS), ...(saved ?? {}), autoStatus: false },
        async saveSettings() { localStorage.setItem("beta-fixture", JSON.stringify(this.data)); tracker.setData(this.data); },
        getCreatureFromBestiary() { return null; },
        getPlayersForParty() { return []; },
        getPlayerByName() { return null; },
        addEncounter(name: string, state: any) { this.data.encounters[name] = state; },
        view: { leaf: {} },
        canUseDiceRoller: false,
        getInitiativeValue() { return 10; },
        players: new Map(), bestiary: [{name:"Ogre",hp:59,ac:11,modifier:1}],
        openCombatant(creature: Creature) { (window as any).openedCombatant = creature.id; }
    };
    plugin.app = { workspace: { trigger: (_name: string, state: unknown) => {
        plugin.data.state = state; void plugin.saveSettings();
    }, revealLeaf() {} } };
    (window as any).app = plugin.app;
    const log: unknown[] = [];
    tracker.setData(plugin.data);
    tracker.setLogger({ logUpdate: (message: unknown) => log.push(message), getLogFile: () => null } as any);
    const first = new Creature({ name: "Goblin", hp: 30, ac: 14, baseColor: "#FF0000" });
    const second = new Creature({ name: "Goblin", hp: 30, ac: 14, baseColor: "#0000FF" });
    first.number = 1; second.number = 2;
    first.initiative = 15; second.initiative = 10;
    tracker.set([first, second]);
    setContext("plugin", plugin);
    let showDifficulty = false;
    let showAdd = false, showSave = false, showPlayer = false;
    const setDifficultyScenario = (levels: number[], xp: number, system = "dnd5e-55") => {
        plugin.data.rpgSystem = system;
        tracker.setData(plugin.data);
        tracker.set([
            ...levels.map((level, i) => new Creature({ name: `Player ${i+1}`, hp: 30, level, player: true })),
            new Creature({ name: "Encounter", hp: 30, xp })
        ]);
        tracker.name.set("Test encounter");
        showDifficulty = true;
    };
    (window as any).fixture = { tracker, first, second, plugin, log, get, recentColours,
        dnd55DifficultyScale, systemDifficultyScale, getRpgSystem, setDifficultyScenario, Creature, sharesInitiative };
    const builderMode = new URLSearchParams(location.search).has("builder");
    const catalogueGoblin = { name: "Goblin", hp: 30, ac: 14, cr: "1/4", xp: 50 };
    if (builderMode) {
        plugin.data.rpgSystem = "dnd5e-55";
        plugin.data.builder.showXP = true;
        plugin.data.encounters = {};
        plugin.data.parties = [{name: "Test party", players: ["Aria", "Borin"]}];
        plugin.getPlayersForParty = (name: string) => name === "Test party" ? [
            new Creature({name:"Aria",level:3,player:true}), new Creature({name:"Borin",level:5,player:true})
        ] : [];
        tracker.setData(plugin.data);
        builderPlayers.empty(); encounter.empty();
        builderPlayers.add({ isPlayer: false, enabled: true, count: 4, level: 1 });
        encounter.add(catalogueGoblin);
        Object.assign((window as any).fixture, { encounter, builderPlayers, catalogueGoblin,
            expandEncounter, groupEncounterCreatures, encounterBlockCreatures, parser: new EncounterParser(plugin) });
    }
    const table = builderMode ? createTable(plugin, [catalogueGoblin,
        { name: "Zero XP", hp: 30, ac: 14, cr: "5", xp: 0 },
        { name: "Ogre", hp: 59, ac: 11, cr: "2" }]) : null;
    const headers = table?.allHeaders ?? readable([]);
    const bestiary = table?.creatures ?? readable([]);
    setContext("table", table);
    if (builderMode) Object.assign((window as any).fixture, { table, createTable });
</script>

<main class="obsidian-initiative-tracker">
    {#if builderMode}
        <div class="builder-fixture initiative-tracker encounter-builder markdown-rendered">
            <h2>Encounter Builder Beta</h2>
            <PartyExperience />
            <BuilderEncounter />
            <button on:click={() => encounter.add(catalogueGoblin)}>Add Goblin from bestiary</button>
            <div class="bestiary-test-scroll">
                <table class="bestiary-test-table"><thead><tr>{#each $headers as header}
                    <th><button on:click={() => table.sort(header)}>{header.text}</button></th>
                {/each}</tr></thead><tbody>{#each $bestiary as creature}<BestiaryCreature {creature} />{/each}</tbody></table>
            </div>
        </div>
    {:else}
    {#if showDifficulty}<Metadata />{:else}<h2>Initiative Tracker Beta</h2>{/if}
    <table class="initiative-tracker-table"><thead><tr><th>Colour</th><th>Init</th><th>Name</th><th>HP</th><th>AC</th></tr></thead>
        <tbody>{#each $tracker as creature (creature.id)}
            <tr on:contextmenu|preventDefault={(event) => showCreatureMenu(creature, () => {}, event)}>
                <CreatureRow {creature} />
            </tr>
        {/each}</tbody>
    </table>
    {#key $updateSession}<Updating />{/key}
    {#if $quickHealth}{#key $quickHealth}<QuickHealth session={$quickHealth} />{/key}{/if}
    <button class="outside">Outside panel</button>
    <button on:click={() => showAdd = true}>Test add combatant</button>
    <button on:click={() => showSave = true}>Test save encounter</button>
    <button on:click={() => showPlayer = !showPlayer}>Test player view</button>
    {#if showAdd}<div class="test-add"><AddCombatant {plugin} on:close={() => showAdd = false} /></div>{/if}
    {#if showSave}<SaveEncounter on:cancel={() => showSave = false} />{/if}
    {#if showPlayer}<div class="test-player"><PlayerView /></div>{/if}
    {/if}
</main>

<style>.bestiary-test-scroll { overflow-x: auto; margin-top: 1rem; }</style>
