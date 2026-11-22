<script lang="ts">
    import { getContext, createEventDispatcher } from "svelte";
    import type InitiativeTracker from "src/main";
    import type { InitiativeViewState } from "src/tracker/view.types";
    import { tracker } from "src/tracker/stores/tracker";
    import { floatingPanel } from "src/tracker/ui/floating-panel";
    import { accessibleName } from "./tooltip";

    export let mode: "save" | "load" = "save";
    export let initialName: string;
    export let getSnapshot: () => InitiativeViewState;

    const plugin = getContext<InitiativeTracker>("plugin");
    const { data } = tracker;
    const dispatch = createEventDispatcher<{ cancel: void; saved: string; load: InitiativeViewState }>();
    let encounterName = initialName ?? "";
    let query = "", checking = false, busy = false, error = "", deleting = "";
    $: title = mode === "save" ? "Save encounter" : "Load encounter";
    $: matches = Object.entries($data.encounters).filter(([name]) => name.toLowerCase().includes(query.trim().toLowerCase()))
        .sort(([a, first], [b, second]) => (second.timestamp ?? 0) - (first.timestamp ?? 0) || a.localeCompare(b));

    async function save() {
        const trimmed = encounterName.trim();
        if (!trimmed || busy) return;
        busy = true;
        error = "";
        try {
            const encounter = getSnapshot();
            await plugin.onExternalSettingsChange?.();
            if (Object.prototype.hasOwnProperty.call(plugin.data.encounters, trimmed) && !checking) {
                checking = true;
                return;
            }
            plugin.addEncounter(trimmed, { ...encounter, name: trimmed, timestamp: Date.now() });
            await plugin.saveSettings();
            dispatch("saved", trimmed);
            dispatch("cancel");
        } catch { error = "Could not save the encounter. Please try again."; }
        finally { busy = false; }
    }

    async function remove(name: string) {
        busy = true;
        error = "";
        try {
            await plugin.removeEncounter(name);
            deleting = "";
        } catch { error = "Could not delete the encounter. Please try again."; }
        finally { busy = false; }
    }
</script>
<div class="coz-tracker-panel library-panel" role="dialog" aria-modal="false" use:accessibleName={title} use:floatingPanel
    on:keydown={(event) => { if (event.key === 'Escape' && !busy) { event.stopPropagation(); dispatch('cancel'); } }}>
    <header><strong>{title}</strong><button type="button" aria-label="Close encounter library" disabled={busy} on:click={() => dispatch('cancel')}>×</button></header>
    {#if mode === 'save'}
        <form class="panel-form" on:submit|preventDefault={save}>
            <div class="panel-scroll form-fields">
                <label>Encounter name<input type="text" autocomplete="off" bind:value={encounterName} on:input={() => checking = false} disabled={busy} /></label>
                {#if checking}<p>A saved encounter already uses this name.</p>{/if}
                {#if error}<p role="alert">{error}</p>{/if}
            </div>
            <footer><button type="button" disabled={busy} on:click={() => dispatch('cancel')}>Cancel</button>
                <button class="mod-cta" type="submit" disabled={!encounterName.trim() || busy}>{checking ? 'Overwrite encounter' : 'Save encounter'}</button></footer>
        </form>
    {:else}
        <label><input type="search" aria-label="Find a saved encounter" placeholder="Find a saved encounter" bind:value={query} on:input={() => deleting = ''} /></label>
        <div class="panel-scroll encounter-list">
            {#if error}<p role="alert">{error}</p>{/if}
            {#each matches as [name, encounter] (name)}
                <div class="saved-row">
                    <button type="button" disabled={busy} class="saved-encounter" on:click={() => { dispatch('load', encounter); dispatch('cancel'); }}>
                        <strong>{name}</strong>
                        <small>{encounter.creatures.length} combatant{encounter.creatures.length === 1 ? '' : 's'}{#if encounter.timestamp} · {new Date(encounter.timestamp).toLocaleDateString()}{/if}</small>
                    </button>
                    {#if deleting === name}
                        <button type="button" disabled={busy} on:click={() => deleting = ''}>Keep</button>
                        <button type="button" disabled={busy} on:click={() => remove(name)} aria-label={`Confirm deletion of ${name}`}>Delete</button>
                    {:else}
                        <button type="button" disabled={busy} on:click={() => deleting = name} aria-label={`Delete ${name}`}>×</button>
                    {/if}
                </div>
            {:else}
                <p>{query.trim() ? 'No encounters match that search.' : 'Saved encounters will appear here.'}</p>
            {/each}
        </div>
    {/if}
</div>
<style>
    .library-panel { width:420px; }
    .panel-form { display:flex; flex:1 1 auto; flex-direction:column; min-height:0; }
    label { display:flex;flex-direction:column;gap:0.4rem; }
    input { width:100%; }
    .encounter-list { display:grid; align-content:start; gap:0.35rem; }
    .saved-row { display:flex; align-items:center; gap:0.35rem; min-width:0; }
    .saved-encounter { display:grid; flex:1; min-width:0; height:auto; justify-items:start; gap:0.2rem; text-align:left; padding:0.45rem 0.6rem; white-space:normal; overflow-wrap:anywhere; }
    small, p { color:var(--text-muted); }
    p { margin:0.45rem 0; }
</style>
