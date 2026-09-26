<script lang="ts">
    import { getContext } from "svelte";
    import type InitiativeTracker from "src/main";
    import { tracker } from "../stores/tracker";
    import { getId } from "src/utils/creature";
    import type { Condition } from "src/types/creatures";
    import { isValidHpMultiplier } from "src/utils/hp-multiplier";
    import { floatingPanel } from "./floating-panel";
    import { accessibleName } from "src/ui/tooltip";
    const plugin = getContext<InitiativeTracker>("plugin");
    const { updating, updateTarget, updateSession, ordered } = tracker;
    let mode = $updateSession?.focusConditions ? 'conditions' : 'damage';
    let damage = '', ac = '', status = '', statuses: Condition[] = [];
    let choosingTargets = false, perTarget = false, maxDirection = 'increase', tempDirection = 'add', conditionAction = 'add';
    const multiplierHelp = 'Multiplies damage or healing for this creature: 1 = normal, 2 = double, 0.5 = half, 0 = none. Saved and Resist halve damage only. Does not change temporary HP or prevent conditions.';
    const validAmount = (value: string) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;
    $: invalidMultiplier = [...$updating.values()].some(entry => !isValidHpMultiplier(entry.customMod));
    $: invalidAmount = $updateTarget === 'hp' && mode !== 'conditions' && damage !== '' && !validAmount(damage);
    $: invalidOverrides = mode === 'heal' && perTarget && [...$updating.values()].some(e => e.amount?.trim() && !validAmount(e.amount));
    function setMode(next: string) {
        mode = next; damage = ''; perTarget = false;
        for (const entry of $updating.values()) { entry.saved = false; entry.resist = false; entry.customMod = '1'; entry.amount = ''; }
        $updating = $updating;
    }
    function addStatus() {
        if (!status.trim()) return;
        const item = plugin.data.statuses.find(s => s.name === status.trim()) ?? { name: status.trim(), id: getId(), description: '' };
        if (!statuses.some(s => s.name === item.name)) statuses = [...statuses, item];
        status = '';
    }
    function apply() {
        if (invalidMultiplier || invalidAmount || invalidOverrides) return;
        if ($updateTarget === 'ac' && ac && !/^[+-]?\d+$/.test(ac)) return;
        let amount = damage || '0';
        if (mode === 'heal') amount = `-${amount}`;
        if (mode === 'temp') amount = `t${tempDirection === 'remove' ? '-' : ''}${amount}`;
        if (mode === 'max') amount = `m${maxDirection === 'increase' ? '-' : ''}${amount}`;
        if (mode === 'conditions') amount = '0';
        for (const entry of $updating.values()) if (!perTarget) entry.amount = '';
        tracker.doUpdate($updateTarget === 'hp' ? amount : '', conditionAction === 'add' ? statuses : [], ac,
            conditionAction === 'remove' ? statuses : [], mode === 'heal');
    }
    function escape(e: KeyboardEvent) {
        if (e.key === 'Escape') { e.stopPropagation(); tracker.clearUpdate(); }
    }
</script>
{#if $updating.size}
<div class="coz-tracker-panel effect-panel" role="dialog" aria-modal="false" use:accessibleName={"Apply effect"} use:floatingPanel on:keydown={escape}>
    <header class="effect-heading"><strong>{$updateTarget === 'hp' ? 'Apply effect' : 'Armour class'} · {$updating.size} {$updating.size === 1 ? 'target' : 'targets'}</strong>
        <button class="panel-drag" type="button" aria-label="Move effect panel">Move</button>
        <button type="button" on:click={() => tracker.clearUpdate()} aria-label="Close effect panel">×</button></header>
    <button type="button" aria-expanded={choosingTargets} on:click={() => choosingTargets = !choosingTargets}>{choosingTargets ? 'Done selecting' : 'Add targets'}</button>
    {#if choosingTargets}
        <div class="target-choices" role="group" use:accessibleName={"Effect targets"}>
            {#each $ordered as creature}<label><input type="checkbox" checked={$updating.has(creature)} on:change={() => tracker.setUpdate(creature)} />{creature.getName()}</label>{/each}
        </div>
    {/if}
    {#if $updateTarget === 'hp'}
        <nav class="effect-modes" use:accessibleName={"Effect type"}>{#each [['damage','Damage'],['heal','Heal'],['temp','Temp HP'],['max','Max HP'],['conditions','Conditions']] as [value,label]}
            <button type="button" aria-pressed={mode === value} on:click={() => setMode(value)}>{label}</button>{/each}</nav>
        <div class="updating-hp">
            {#if mode !== 'conditions'}
                <label>{mode === 'heal' ? 'Heal each target for' : mode === 'damage' ? 'Damage per target' : mode === 'temp' ? 'Temporary HP per target' : 'Maximum HP change per target'}
                    <input type="text" inputmode="decimal" bind:value={damage} autofocus on:keydown={(e) => { if (e.key === 'Enter') apply(); }} />
                </label>
                {#if mode === 'max'}<label>Direction<select bind:value={maxDirection}><option value="increase">Increase</option><option value="decrease">Decrease</option></select></label>{/if}
                {#if mode === 'heal'}<label class="inline"><input type="checkbox" bind:checked={perTarget} />Set individual healing amounts</label>{/if}
                {#if mode === 'temp'}<label>Temporary HP action<select aria-label="Temporary HP action" bind:value={tempDirection}><option value="add">Grant temporary HP</option><option value="remove">Remove temporary HP</option></select></label><small>Uses your existing temporary HP stacking setting.</small>{/if}
            {/if}
            <div class="input-status"><label>Condition<input type="text" list="coz-effect-conditions" bind:value={status} autofocus={mode === 'conditions'} on:keydown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addStatus(); } }} /></label>
                <datalist id="coz-effect-conditions">{#each plugin.data.statuses as condition}<option value={condition.name} />{/each}</datalist>
                <button type="button" on:click={addStatus} disabled={!status.trim()}>Add to effect</button>
            </div>
            {#if statuses.length}<label>Conditions<select aria-label="Conditions" bind:value={conditionAction}><option value="add">Apply selected conditions</option><option value="remove">Remove selected conditions</option></select></label>
                <div class="condition-list">{#each statuses as condition}<button type="button" on:click={() => statuses = statuses.filter(s => s !== condition)}>{condition.name} ×</button>{/each}</div>{/if}
        </div>
    {:else}<label>Set AC, or use +/− to adjust<input type="text" bind:value={ac} on:keydown={(e) => { if (e.key === 'Enter') apply(); }} /></label>{/if}
    <div class="target-table-scroll"><table class="updating-creature-table"><thead><tr><th>Name / statblock</th>
        {#if $updateTarget === 'hp'}<th>Saved</th><th>Resist</th><th title={multiplierHelp}>Multiplier (×)</th>{#if mode === 'heal' && perTarget}<th>Heal HP</th>{/if}{/if}<th></th></tr></thead>
        <tbody>{#each [...$updating.entries()] as [creature, update]}<tr>
            <td class="target-title"><button class="target-name" type="button" on:click={(e) => plugin.openCombatant(creature, e.ctrlKey || e.metaKey)}>
                {#if creature.baseColor}<span class="target-colour" style:background-color={creature.baseColor} />{/if}{creature.getName()}</button></td>
            {#if $updateTarget === 'hp'}
                <td data-field="Saved"><input type="checkbox" aria-label={`Saved: ${creature.getName()}`} bind:checked={update.saved} disabled={mode !== 'damage' && mode !== 'conditions'} /></td>
                <td data-field="Resist"><input type="checkbox" aria-label={`Resist: ${creature.getName()}`} bind:checked={update.resist} disabled={mode !== 'damage'} /></td>
                <td data-field="Multiplier"><input type="number" min="0" step="any" title={multiplierHelp} aria-label={`HP multiplier for ${creature.getName()}`} value={update.customMod} disabled={mode === 'temp' || mode === 'conditions'}
                    on:input={(e) => { update.customMod = e.currentTarget.value; $updating = $updating; }}
                    on:keydown={(e) => { if(e.key === 'Escape') { e.stopPropagation(); update.customMod = '1'; $updating = $updating; } }} /></td>
                {#if mode === 'heal' && perTarget}<td data-field="Heal HP"><input type="text" inputmode="decimal" aria-label={`Healing for ${creature.getName()}`} placeholder={damage || '0'} bind:value={update.amount} /></td>{/if}
            {/if}
            <td class="target-remove"><button type="button" aria-label={`Remove target ${creature.getName()}`} on:click={() => tracker.setUpdate(creature)}>×</button></td>
        </tr>{/each}</tbody></table></div>
    <small class="multiplier-help">Multiplier: 1 normal · 2 double · 0.5 half · 0 no HP change. Saved and Resist affect damage; Saved also skips applying conditions.</small>
    {#if invalidMultiplier || invalidAmount || invalidOverrides}<p role="alert">Enter a valid amount and a multiplier of 0 or more for every target.</p>{/if}
    <footer class="updating-buttons"><button type="button" aria-label="Cancel" on:click={() => tracker.clearUpdate()}>Cancel</button><button class="mod-cta" type="button" aria-label="Apply" on:click={apply}>Apply effect</button></footer>
</div>
{/if}
<style>
.effect-panel { width: 540px; } .effect-modes,.condition-list { display:flex;flex-wrap:wrap;gap:4px; }
.effect-modes [aria-pressed=true] { background:var(--interactive-accent);color:var(--text-on-accent); }
.updating-hp { display:flex;flex-direction:column;gap:10px; } label { display:flex;flex-direction:column;gap:4px; }
.inline,.target-choices label { flex-direction:row;align-items:center;gap:6px; }
.target-choices { max-height:180px;overflow:auto;padding:8px;border:1px solid var(--background-modifier-border);border-radius:6px; }
.input-status { display:flex;align-items:end;gap:8px; } .input-status label { flex:1;min-width:0; }
.target-table-scroll { overflow-x:auto; flex-shrink:0; } table { width:100%;font-size:var(--font-ui-small);border-collapse:collapse; }
:is(th,td) { padding:6px 4px;text-align:center; } :is(th,td):first-child { text-align:left; }
td input[type=number],td input[type=text] { width:64px; } .target-name { display:flex;align-items:center;gap:5px;text-align:left;white-space:normal; }
.target-colour { width:10px;height:10px;border-radius:50%;flex-shrink:0; } small { color:var(--text-muted);line-height:1.45; }
@media (max-width:600px), (pointer:coarse) {
    .target-table-scroll { overflow:visible; }
    table,tbody { display:block; }
    thead { display:none; }
    tr { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; padding:10px; margin-bottom:8px; border:1px solid var(--background-modifier-border);border-radius:8px; }
    td { display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0;min-width:0; }
    td[data-field]::before { content:attr(data-field);font-size:var(--font-ui-small); }
    .target-title { grid-column:1 / -1; } .target-title button { width:100%; }
    .target-remove { justify-content:flex-end; }
    .input-status { flex-wrap:wrap; }
    .effect-heading { flex-wrap:wrap; }
}
</style>
