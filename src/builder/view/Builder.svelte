<script lang="ts">
    import type InitiativeTracker from "src/main";
    import { setContext } from "svelte";

    import Creatures from "./creatures/Creatures.svelte";
    import BuilderLayout from "./BuilderLayout.svelte";
    import {
        type BuiltFilterStore,
        createFilterStore
    } from "../stores/filter/filter";
    import { type BuiltTableStore, createTable } from "../stores/table/table";

    export let plugin: InitiativeTracker;
    let original = plugin.bestiary;
    const table = createTable(plugin, [...original]);

    setContext<BuiltTableStore>("table", table);
    const filterStore = createFilterStore(table.creatures, plugin);
    setContext<BuiltFilterStore>("filters", filterStore);

    if (!plugin.data.builder) {
        plugin.data.builder = {
            sidebarIcon: true,
            showParty: true,
            showXP: true
        };
    }
    setContext("plugin", plugin);

</script>

<div class="initiative-tracker encounter-builder markdown-rendered">
    <BuilderLayout><Creatures /></BuilderLayout>
</div>

<style>
    .encounter-builder {
        margin: 1rem;
    }
</style>
