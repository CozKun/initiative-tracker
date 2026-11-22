<script lang="ts">
    import type InitiativeTracker from "src/main";
    import { setContext } from "svelte";
    import Controls from "./Controls.svelte";
    import Table from "./creatures/Table.svelte";
    import Metadata from "./Metadata.svelte";
    import EncounterLibrary from "src/ui/EncounterLibrary.svelte";
    import { tracker } from "../stores/tracker";
    import Updating from "./Updating.svelte";
    import QuickHealth from "./QuickHealth.svelte";
    import Logger from "src/logger/logger";
    import { AddCreatureModal } from "./create/modal";
    import type { Creature } from "src/utils/creature";

    export let plugin: InitiativeTracker;
    const { name, quickHealth, updateSession } = tracker;
    setContext("plugin", plugin);

    tracker.setData(plugin.data);
    tracker.setLogger(new Logger(plugin));
    if (plugin.data.state) {
        tracker.new(plugin, plugin.data.state, { useSavedRoster: true, persist: false });
    } else {
        tracker.setParty(plugin.data.defaultParty, plugin);
        tracker.roll(plugin);
    }

    let library: "save" | "load" | null = null;
    const editOrAdd = (creature?: Creature) => new AddCreatureModal(plugin, creature).open();
</script>

<div class="obsidian-initiative-tracker">
    <Controls on:save={() => library = 'save'} on:load={() => library = 'load'}
        on:add-creatures={() => editOrAdd()} on:player-view on:open-map />
    <Metadata />
    <Table on:edit={(event) => editOrAdd(event.detail)}
        on:open-combatant={(event) => plugin.openCombatant(event.detail.creature, event.detail.newLeaf)} />
    {#key $updateSession}<Updating />{/key}
    {#if $quickHealth}{#key $quickHealth}<QuickHealth session={$quickHealth} />{/key}{/if}
    {#if library}
        <EncounterLibrary mode={library} initialName={$name} getSnapshot={tracker.getEncounterState}
            on:cancel={() => library = null} on:saved={(event) => { $name = event.detail; tracker.updateAndSave(); }}
            on:load={(event) => tracker.new(plugin, event.detail, {useSavedRoster:true})} />
    {/if}
</div>

<style>
    .obsidian-initiative-tracker { margin:0.5rem; min-width:0; }
</style>
