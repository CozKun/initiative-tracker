<script lang="ts">
    import { setContext, createEventDispatcher } from 'svelte';
    import { get } from 'svelte/store';
    import type InitiativeTracker from 'src/main';
    import { Creature } from 'src/utils/creature';
    import { sharesInitiative } from 'src/utils/shared-initiative';
    import { tracker } from '../../stores/tracker';
    import NumberEntry from 'src/ui/NumberEntry.svelte';
    export let plugin: InitiativeTracker;
    setContext('plugin', plugin);
    const dispatch = createEventDispatcher();
    let role = 'enemy', query = '', name = '', hp = '1', ac = '10', modifier = '0', level = '1', quantity = '1', initiative = '';
    let source: any = {}, rollMode = 'manual', hidden = false, rollHP = false, fixed = false, error = '';
    $: catalogue = role === 'player' ? [...(plugin.players?.values() ?? [])] : (plugin.bestiary ?? []);
    $: matches = query.trim() ? catalogue.filter(c => c.name?.toLowerCase().includes(query.toLowerCase())).slice(0, 20) : [];
    function choose(item: any) {
        const creature = Creature.from(item);
        source = { ...item }; name = creature.name; hp = String(creature.max ?? 1); ac = String(creature.ac ?? 10);
        modifier = JSON.stringify(creature.modifier ?? 0); level = String(creature.level ?? 1); query = '';
    }
    function changeRole() { source = {}; query = ''; name = ''; hp = '1'; ac = '10'; modifier = '0'; level = '1'; quantity = '1'; initiative = ''; }
    function add() {
        error = '';
        let mod: number | number[];
        try { mod = JSON.parse(modifier); } catch { error = 'Enter a numeric initiative modifier (or an array of numbers).'; return; }
        if (!(typeof mod === 'number' && Number.isFinite(mod)) && !(Array.isArray(mod) && mod.length && mod.every(v => typeof v === 'number' && Number.isFinite(v)))) { error = 'Enter valid initiative modifiers.'; return; }
        const count = role === 'player' ? 1 : Number(quantity);
        if (!name.trim() || !String(hp ?? '').trim() || !Number.isFinite(Number(hp)) || Number(hp) < 0 || !ac.trim() ||
            !Number.isSafeInteger(count) || count < 1 || count > 1000 ||
            (role === 'player' && (!Number.isInteger(Number(level)) || Number(level) < 1)) ||
            (rollMode === 'manual' && (!String(initiative ?? '').trim() || !Number.isFinite(Number(initiative))))) {
            error = 'Enter a name, valid HP and initiative, and a quantity from 1 to 1,000 (players need a level).'; return;
        }
        const items: Creature[] = [];
        for (let i = 0; i < count; i++) {
            const item = new Creature({ ...source, id: undefined, name: name.trim(), hp: Number(hp), ac: Number.isFinite(Number(ac)) ? Number(ac) : ac,
                modifier: mod, player: role === 'player', friendly: role === 'ally', hidden, static: fixed, active: false,
                level: role === 'player' ? Number(level) : source.level, initiative: undefined } as any);
            if (rollMode === 'manual') item.initiative = Number(initiative);
            else {
                const shared = plugin.data.condense && [...get(tracker), ...items].find(c => sharesInitiative(c, item));
                item.initiative = shared ? shared.initiative : plugin.getInitiativeValue(mod);
            }
            items.push(item);
        }
        tracker.addPrepared(plugin, rollHP, ...items);
        dispatch('close');
    }
</script>
<form class="coz-add-combatant" on:submit|preventDefault={add}>
    <h3>Add to this encounter</h3>
    <p>Existing turns and initiatives stay in place. This does not change your saved party.</p>
    <label>Combatant type<select aria-label="Combatant type" bind:value={role} on:change={changeRole}><option value="enemy">Enemy</option><option value="ally">Ally</option><option value="player">Player</option></select></label>
    <label>{role === 'player' ? 'Search saved players' : 'Search bestiary'}<input type="search" bind:value={query} placeholder="Search, or enter details below" /></label>
    {#if query.trim()}<div class="search-results">{#each matches as item}<button type="button" on:click={() => choose(item)}>{item.name}</button>{:else}<small>No matches. Enter a name and stats below.</small>{/each}</div>{/if}
    <label>Name<input bind:value={name} required /></label>
    <div class="fields">
        <NumberEntry label="HP" value={hp} decimal min={0} on:set={(event) => hp = event.detail}>
            <input aria-label="HP" type="number" min="0" step="any" bind:value={hp} required />
        </NumberEntry>
        <NumberEntry label="AC" value={ac} decimal sign="minus" allowText on:set={(event) => ac = event.detail}>
            <input aria-label="AC" bind:value={ac} required />
        </NumberEntry>
        {#if role === 'player'}
            <NumberEntry label="Level" value={level} min={1} on:set={(event) => level = event.detail}>
                <input aria-label="Level" type="number" min="1" bind:value={level} />
            </NumberEntry>
        {:else}
            <NumberEntry label="Quantity" value={quantity} min={1} max={1000} on:set={(event) => quantity = event.detail}>
                <input aria-label="Quantity" type="number" min="1" max="1000" bind:value={quantity} />
            </NumberEntry>
        {/if}
    </div>
    <div class="fields">
        <NumberEntry label="Initiative modifier" value={modifier} decimal sign="minus" allowText on:set={(event) => modifier = event.detail}>
            <input aria-label="Initiative modifier" bind:value={modifier} />
        </NumberEntry>
        <label>Initiative method<select aria-label="Initiative method" bind:value={rollMode}><option value="manual">Enter manually</option><option value="roll">Roll initiative</option></select></label>
    </div>
    {#if rollMode === 'manual'}
        <NumberEntry label="Initiative" value={initiative} decimal sign="minus" on:set={(event) => initiative = event.detail}>
            <input aria-label="Initiative" type="number" step="any" bind:value={initiative} required />
        </NumberEntry>
    {:else}<small>Only the new combatants are rolled. With shared initiative enabled, matching creatures join their existing initiative.</small>{/if}
    <details><summary>More options</summary><label class="inline"><input type="checkbox" bind:checked={hidden} />Hidden from player view</label><label class="inline"><input type="checkbox" bind:checked={fixed} />Keep initiative fixed when rerolling</label>
    {#if plugin.canUseDiceRoller}<label class="inline"><input type="checkbox" bind:checked={rollHP} />Roll HP from available hit dice</label>{/if}</details>
    {#if error}<p role="alert">{error}</p>{/if}
    <footer><button type="button" on:click={() => dispatch('close')}>Cancel</button><button class="mod-cta" type="submit">Add to encounter</button></footer>
</form>
<style>
.coz-add-combatant { display:flex;flex-direction:column;gap:12px; } h3 { margin:0;font-size:1.1rem; } p,small { margin:0;color:var(--text-muted);line-height:1.45; }
label { display:flex;flex-direction:column;gap:5px;min-width:0; } .fields { display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:10px; } input,select { width:100%; }
.inline { flex-direction:row;align-items:center;margin-top:8px; } .inline input { width:auto; } footer { display:flex;justify-content:flex-end;gap:8px; }
.search-results { display:flex;flex-direction:column;gap:4px;max-height:180px;overflow:auto; } .search-results button { text-align:left; }
</style>
