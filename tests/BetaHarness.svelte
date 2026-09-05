<script lang="ts">
    import { setContext } from "svelte";
    import { get } from "svelte/store";
    import { tracker } from "../src/tracker/stores/tracker";
    import { Creature } from "../src/utils/creature";
    import { DEFAULT_SETTINGS } from "../src/utils/constants";
    import { recentColours } from "../src/utils/recent-colours";
    import CreatureRow from "../src/tracker/ui/creatures/Creature.svelte";
    import QuickHealth from "../src/tracker/ui/QuickHealth.svelte";
    import Updating from "../src/tracker/ui/Updating.svelte";
    import Difficulty from "../src/tracker/ui/Difficulty.svelte";
    import { dnd55DifficultyScale } from "../src/utils/difficulty-scale";
    import { getRpgSystem } from "../src/utils/rpg-system";
    import { showCreatureMenu } from "../src/tracker/ui/creatures/creature-menu";

    const { quickHealth, updateSession, updating } = tracker;
    const saved = JSON.parse(localStorage.getItem("beta-fixture") ?? "null");
    const plugin: any = {
        data: { ...structuredClone(DEFAULT_SETTINGS), ...(saved ?? {}), autoStatus: false },
        async saveSettings() { localStorage.setItem("beta-fixture", JSON.stringify(this.data)); tracker.setData(this.data); },
        getCreatureFromBestiary() { return null; }
    };
    plugin.app = { workspace: { trigger: (_name: string, state: unknown) => {
        plugin.data.state = state; void plugin.saveSettings();
    } } };
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
    const setDifficultyScenario = (levels: number[], xp: number, system = "dnd5e-55") => {
        plugin.data.rpgSystem = system;
        tracker.setData(plugin.data);
        tracker.set([
            ...levels.map((level, i) => new Creature({ name: `Player ${i+1}`, hp: 30, level, player: true })),
            new Creature({ name: "Encounter", hp: 30, xp })
        ]);
        showDifficulty = true;
    };
    (window as any).fixture = { tracker, first, second, plugin, log, get, recentColours,
        dnd55DifficultyScale, getRpgSystem, setDifficultyScenario };
</script>

<main class="obsidian-initiative-tracker">
    <h2>Initiative Tracker Beta</h2>
    {#if showDifficulty}<Difficulty />{/if}
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
</main>
