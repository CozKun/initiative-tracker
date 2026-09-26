<script lang="ts">
    import { getContext, createEventDispatcher } from "svelte";
    import type InitiativeTracker from "src/main";
    import { tracker } from "../stores/tracker";
    import { floatingPanel } from "./floating-panel";
    import { accessibleName } from "src/ui/tooltip";
    const plugin = getContext<InitiativeTracker>("plugin");
    const { name } = tracker;
    const dispatch = createEventDispatcher();
    let encounterName = $name ?? "";
    let checking = false, saving = false, error = "";
    async function save() {
        const trimmed = encounterName.trim();
        if (!trimmed || saving) return;
        if (trimmed in plugin.data.encounters && !checking) { checking = true; return; }
        saving = true;
        try {
            plugin.addEncounter(trimmed, { ...tracker.getEncounterState(), name: trimmed,
                rollHP: plugin.data.rollHP, timestamp: Date.now() });
            await plugin.saveSettings(); dispatch("cancel");
        } catch { error = "Could not save the encounter. Please try again."; }
        finally { saving = false; }
    }
</script>
<div class="coz-tracker-panel save-panel" role="dialog" aria-modal="false" use:accessibleName={"Save encounter"} use:floatingPanel
    on:keydown={(e) => { if (e.key === 'Escape') dispatch('cancel'); }}>
    <header><strong>Save encounter</strong><button class="panel-drag" type="button" aria-label="Move save panel">Move</button></header>
    <form on:submit|preventDefault={save}>
        <label>Encounter name<input autofocus bind:value={encounterName} on:input={() => checking = false} /></label>
        {#if checking}<p>An encounter with that name exists. Overwrite it?</p>{/if}
        {#if error}<p role="alert">{error}</p>{/if}
        <footer><button type="button" on:click={() => dispatch('cancel')}>Cancel</button>
            <button class="mod-cta" type="submit" disabled={!encounterName.trim() || saving}>{checking ? 'Overwrite encounter' : 'Save encounter'}</button></footer>
    </form>
</div>
<style>.save-panel { width: 380px; } label { display:flex;flex-direction:column;gap:6px; } input { width:100%; } </style>
