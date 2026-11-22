<script lang="ts">
    import { getContext } from "svelte";
    import { Notice, setIcon, stringifyYaml } from "obsidian";
    import { tooltip } from "src/ui/tooltip";
    import EncounterLibrary from "src/ui/EncounterLibrary.svelte";
    import { START_ENCOUNTER } from "src/utils";
    import { tracker } from "src/tracker/stores/tracker";
    import type { InitiativeViewState } from "src/tracker/view.types";
    import { Creature as CreatureModel } from "src/utils/creature";
    import { encounter } from "../../stores/encounter";
    import { expandPlayers, savePlayerSelection } from "../../stores/players";
    import { expandEncounter, encounterBlockCreatures, groupEncounterCreatures } from "../../encounter-creatures";
    import Experience from "../party/Experience.svelte";
    import Creature from "./Creature.svelte";

    const plugin = getContext("plugin");
    const { players, name } = encounter;
    let draftName = "", editingName = false;
    let rollHP = plugin.data.rollHP;
    let library: "save" | "load" | null = null;
    const icon = (node: HTMLElement, value: string) => setIcon(node, value);
    $: items = [...$encounter.entries()];

    function rename() {
        $name = draftName.trim() || $name;
        editingName = false;
    }
    const snapshot = (): InitiativeViewState => ({
        creatures: [...expandPlayers($players, (player) => plugin.getPlayerByName(player)), ...expandEncounter($encounter)]
            .map((creature) => creature.toJSON()),
        builderPlayers: savePlayerSelection($players), name: $name, round: 1,
        state: false, logFile: null, newLog: true, roll: true, rollHP
    });
    async function start() {
        if (!plugin.view) await plugin.addTrackerView();
        tracker.new(plugin, snapshot(), { useSavedRoster: true });
        plugin.app.workspace.revealLeaf(plugin.view.leaf);
    }
    function load(saved: InitiativeViewState) {
        $name = saved.name;
        players.restore(saved.creatures, saved.builderPlayers);
        encounter.setMultiple(groupEncounterCreatures(saved.creatures.filter((creature) => !creature.player)
            .map((creature) => CreatureModel.fromJSON(creature, plugin))));
        rollHP = saved.rollHP ?? plugin.data.rollHP;
    }
    function clear() {
        encounter.empty();
        $name = "Encounter";
    }
    async function copy() {
        const block = {
            name: $name,
            players: $players.filter((player) => player.enabled && player.isPlayer).map((player) => player.name),
            creatures: encounterBlockCreatures($encounter)
        };
        try {
            await navigator.clipboard.writeText("```encounter\n" + stringifyYaml(block).trimEnd() + "\n```");
            new Notice("Encounter copied to clipboard.");
        } catch (error) {
            console.error(error);
            new Notice("Could not copy the encounter.");
        }
    }
</script>

<div class="encounter-header">
    <div class="encounter-name">
        {#if editingName}
            <form on:submit|preventDefault={rename}>
                <input type="text" bind:value={draftName} aria-label="Encounter title" on:keydown={(event) => { if (event.key === 'Escape') editingName = false; }} />
                <button type="submit" aria-label="Apply encounter name" use:icon={"check"} />
                <button type="button" aria-label="Cancel renaming" use:icon={"x"} on:click={() => editingName = false} />
            </form>
        {:else}
            <h3 class="built-encounter builder-section-heading">{$name}</h3>
            <button type="button" use:tooltip={{text:"Rename this encounter",label:"Rename this encounter"}} use:icon={"pencil"} on:click={() => { draftName = $name; editingName = true; }} />
        {/if}
    </div>
    <button class="mod-cta start-encounter" type="button" disabled={!items.length}
        use:tooltip={{text:"Start this encounter in the initiative tracker",label:"Start this encounter in the initiative tracker"}} on:click={start}>
        <span use:icon={START_ENCOUNTER} aria-hidden="true" /> Start encounter
    </button>
</div>
<div class="encounter-controls">
    <button type="button" disabled={!items.length}
        use:tooltip={{text:"Save this encounter and its Mini Colour Indicators",label:"Save this encounter and its Mini Colour Indicators"}} on:click={() => library = 'save'}>Save</button>
    <button type="button" use:tooltip={{text:"Load a saved encounter, replacing the current builder contents",label:"Load a saved encounter, replacing the current builder contents"}} on:click={() => library = 'load'}>Load</button>
    <button type="button" disabled={!items.length} use:tooltip={{text:"Copy an encounter block, including Mini Colour Indicators, to paste into a note",label:"Copy an encounter block, including Mini Colour Indicators, to paste into a note"}} on:click={copy}>Copy block</button>
    <button type="button" disabled={!items.length} use:tooltip={{text:"Clear the encounter creatures and keep the selected party",label:"Clear the encounter creatures; keep the selected party"}} on:click={clear}>Clear</button>
</div>
<Experience />
{#if !items.length}
    <p class="empty-encounter">Add creatures from the bestiary to build your encounter.</p>
{:else}
    <div class="encounter-creatures">
        {#each items as [creature, count] (creature)}
            <Creature {creature} {count} />
        {/each}
    </div>
{/if}
{#if library}
    <EncounterLibrary mode={library} initialName={$name === 'Encounter' ? '' : $name} getSnapshot={snapshot}
        on:cancel={() => library = null} on:saved={(event) => $name = event.detail} on:load={(event) => load(event.detail)} />
{/if}

<style>
    .encounter-name { display:flex; align-items:center; gap:0.4rem; min-width:0; overflow-wrap:anywhere; }
    .encounter-name form { display:flex; flex-wrap:wrap; gap:0.35rem; min-width:0; }
    .encounter-name input { width:min(100%,16rem); }
    .encounter-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.55rem;
        padding-bottom:0.55rem; margin-bottom:0.55rem; border-bottom:1px solid var(--background-modifier-border); }
    .encounter-creatures { display:flex; flex-direction:column; gap:0.5rem; margin-top:0.65rem; }
    .encounter-controls { display:flex; flex-wrap:wrap; gap:0.35rem; align-items:center; margin-bottom:0.65rem; }
    .start-encounter { display:inline-flex; align-items:center; gap:0.4rem; white-space:normal; }
    .start-encounter span { display:flex; }
    .empty-encounter { color:var(--text-muted); margin:0.65rem 0 0; }
</style>
