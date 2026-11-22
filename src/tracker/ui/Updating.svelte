<script lang="ts">
    import { getContext, onMount } from "svelte";
    import type InitiativeTracker from "src/main";
    import { tracker } from "../stores/tracker";
    import { getId } from "src/utils/creature";
    import type { Condition } from "src/types/creatures";
    import type { Creature } from "src/utils/creature";
    import { isValidHpMultiplier } from "src/utils/hp-multiplier";
    import { floatingPanel } from "./floating-panel";
    import { accessibleName } from "src/ui/tooltip";
    import NumberEntry from "src/ui/NumberEntry.svelte";
    import { prefersTouchInput } from "./viewport";
    const plugin = getContext<InitiativeTracker>("plugin");
    const { updating, updateTarget, updateSession, ordered } = tracker;
    let mode = $updateSession?.focusConditions ? 'conditions' : 'damage';
    let damage = '', ac = '', status = '', statuses: Condition[] = [];
    let choosingTargets = false, perTarget = false, maxDirection = 'increase', tempDirection = 'add', conditionAction = 'add';
    let statblock: Creature | null = null;
    let panel: HTMLElement;
    let touch = false, choosingCondition = false, customCondition = false;
    onMount(() => { touch = prefersTouchInput(panel?.ownerDocument.defaultView ?? window); });
    const mountStatblock = (node: HTMLElement, creature: Creature) => ({ destroy: plugin.attachCombatantDetails(creature, node) });
    const multiplierHelp = 'Multiplies damage or healing for this creature: 1 = normal, 2 = double, 0.5 = half, 0 = none. Saved and Resist halve damage only. Does not change temporary HP or prevent conditions.';
    const validAmount = (value: string) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;
    $: invalidMultiplier = [...$updating.values()].some(entry => !isValidHpMultiplier(entry.customMod));
    $: invalidAmount = $updateTarget === 'hp' && mode !== 'conditions' && damage !== '' && !validAmount(damage);
    $: invalidOverrides = mode === 'heal' && perTarget && [...$updating.values()].some(e => e.amount?.trim() && !validAmount(e.amount));
    $: showSaved = $updateTarget === 'hp' && (mode === 'damage' || mode === 'conditions');
    $: showResist = $updateTarget === 'hp' && mode === 'damage';
    $: showMultiplier = $updateTarget === 'hp' && (mode === 'damage' || mode === 'heal' || mode === 'max');
    function setMode(next: string) {
        mode = next; damage = ''; perTarget = false;
        for (const entry of $updating.values()) { entry.saved = false; entry.resist = false; entry.customMod = '1'; entry.amount = ''; }
        $updating = $updating;
    }
    $: amountLabel = mode === 'heal' ? 'Heal each target for' : mode === 'damage' ? 'Damage per target'
        : mode === 'temp' ? 'Temporary HP per target' : 'Maximum HP change per target';
    const acLabel = "Set AC, or use +/− to adjust";
    function addStatus(name = status) {
        if (!name.trim()) return;
        const item = plugin.data.statuses.find(s => s.name === name.trim()) ?? { name: name.trim(), id: getId(), description: '' };
        if (!statuses.some(s => s.name === item.name)) statuses = [...statuses, item];
        status = '';
    }
    function chooseStatus(name: string) {
        addStatus(name);
        choosingCondition = false;
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
        if (e.key === 'Escape') {
            e.stopPropagation();
            if (statblock) statblock = null;
            else tracker.clearUpdate();
        }
    }
</script>
{#if $updating.size}
<div class="coz-tracker-panel effect-panel" role="dialog" aria-modal="false" bind:this={panel} use:accessibleName={"Apply effect"} use:floatingPanel on:keydown={escape}>
    <header class="effect-heading"><strong>{$updateTarget === 'hp' ? 'Apply effect' : 'Armour class'} · {$updating.size} {$updating.size === 1 ? 'target' : 'targets'}</strong>
        <button type="button" aria-expanded={!!statblock} on:click={() => statblock = statblock ? null : $updating.keys().next().value}>Statblocks</button>
        <button class="panel-drag" type="button" aria-label="Move effect panel">Move</button>
        <button type="button" on:click={() => tracker.clearUpdate()} aria-label="Close effect panel">×</button></header>
    <div class="panel-scroll effect-fields" hidden={!!statblock}>
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
                <NumberEntry label={amountLabel} value={damage} decimal min={0} allowEmpty on:set={(event) => damage = event.detail}>
                    <input type="text" inputmode="decimal" aria-label={amountLabel} autocomplete="off" bind:value={damage} on:keydown={(e) => { if (e.key === 'Enter') apply(); }} />
                </NumberEntry>
                {#if mode === 'max'}<label>Direction<select bind:value={maxDirection}><option value="increase">Increase</option><option value="decrease">Decrease</option></select></label>{/if}
                {#if mode === 'heal'}<label class="inline"><input type="checkbox" bind:checked={perTarget} />Set individual healing amounts</label>{/if}
                {#if mode === 'temp'}<label>Temporary HP action<select aria-label="Temporary HP action" bind:value={tempDirection}><option value="add">Grant temporary HP</option><option value="remove">Remove temporary HP</option></select></label><small>Uses your existing temporary HP stacking setting.</small>{/if}
            {/if}
            {#if touch}
                <div class="condition-tools">
                    <button type="button" aria-expanded={choosingCondition} on:click={() => { choosingCondition = !choosingCondition; customCondition = false; }}>Choose condition</button>
                    <button type="button" aria-expanded={customCondition} on:click={() => { customCondition = !customCondition; choosingCondition = false; }}>Custom condition</button>
                </div>
                {#if choosingCondition}
                    <div class="condition-choices" role="group" use:accessibleName={"Available conditions"}>
                        {#each plugin.data.statuses as condition}
                            <button type="button" disabled={statuses.some((item) => item.name === condition.name)} on:click={() => chooseStatus(condition.name)}>{condition.name}</button>
                        {/each}
                    </div>
                {/if}
            {/if}
            {#if !touch || customCondition}
                <div class="input-status"><label>Condition<input type="text" list={touch ? undefined : "coz-effect-conditions"} bind:value={status} on:keydown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addStatus(); } }} /></label>
                    {#if !touch}<datalist id="coz-effect-conditions">{#each plugin.data.statuses as condition}<option value={condition.name} />{/each}</datalist>{/if}
                    <button type="button" on:click={() => addStatus()} disabled={!status.trim()}>Add to effect</button>
                </div>
            {/if}
            {#if statuses.length}<label>Conditions<select aria-label="Conditions" bind:value={conditionAction}><option value="add">Apply selected conditions</option><option value="remove">Remove selected conditions</option></select></label>
                <div class="condition-list">{#each statuses as condition}<button type="button" on:click={() => statuses = statuses.filter(s => s !== condition)}>{condition.name} ×</button>{/each}</div>{/if}
        </div>
    {:else}
        <NumberEntry label={acLabel} value={ac} sign="both" allowEmpty on:set={(event) => ac = event.detail}>
            <input type="text" aria-label={acLabel} bind:value={ac} on:keydown={(e) => { if (e.key === 'Enter') apply(); }} />
        </NumberEntry>
    {/if}
    <div class="target-table-scroll"><table class="updating-creature-table"><thead><tr><th>Name / statblock</th>
        {#if showSaved}<th>Saved</th>{/if}{#if showResist}<th>Resist</th>{/if}{#if showMultiplier}<th title={multiplierHelp}>Multiplier (×)</th>{/if}{#if mode === 'heal' && perTarget}<th>Heal HP</th>{/if}<th></th></tr></thead>
        <tbody>{#each [...$updating.entries()] as [creature, update] (creature.id)}<tr>
            <td class="target-title"><button class="target-name" type="button" on:click={(event) => { if (event.ctrlKey || event.metaKey) plugin.openCombatant(creature, true); else statblock = creature; }}>
                {#if creature.baseColor}<span class="target-colour" style:background-color={creature.baseColor} />{/if}{creature.getName()} <span class="statblock-action" aria-hidden="true">Statblock</span></button></td>
            {#if showSaved}<td data-field="Saved"><input type="checkbox" aria-label={`Saved: ${creature.getName()}`} bind:checked={update.saved} /></td>{/if}
            {#if showResist}<td data-field="Resist"><input type="checkbox" aria-label={`Resist: ${creature.getName()}`} bind:checked={update.resist} /></td>{/if}
            {#if showMultiplier}<td data-field="Multiplier"><NumberEntry label={`HP multiplier for ${creature.getName()}`} value={update.customMod} showLabel={false} decimal min={0}
                    on:set={(event) => { update.customMod = event.detail; $updating = $updating; }}>
                <input type="number" min="0" step="any" title={multiplierHelp} aria-label={`HP multiplier for ${creature.getName()}`} value={update.customMod}
                    on:input={(e) => { update.customMod = e.currentTarget.value; $updating = $updating; }}
                    on:keydown={(e) => { if(e.key === 'Escape') { e.stopPropagation(); update.customMod = '1'; $updating = $updating; } }} />
            </NumberEntry></td>{/if}
            {#if mode === 'heal' && perTarget}<td data-field="Heal HP"><NumberEntry label={`Healing for ${creature.getName()}`} value={update.amount} showLabel={false} decimal min={0}
                    allowEmpty placeholder={damage || '0'} on:set={(event) => update.amount = event.detail}>
                <input type="text" inputmode="decimal" aria-label={`Healing for ${creature.getName()}`} placeholder={damage || '0'} bind:value={update.amount} />
            </NumberEntry></td>{/if}
            <td class="target-remove"><button type="button" aria-label={`Remove target ${creature.getName()}`} on:click={() => tracker.setUpdate(creature)}>×</button></td>
        </tr>{/each}</tbody></table></div>
    {#if showMultiplier}<small class="multiplier-help">Multiplier: 1 normal · 2 double · 0.5 half · 0 no HP change.</small>{/if}
    {#if invalidMultiplier || invalidAmount || invalidOverrides}<p role="alert">Enter a valid amount and a multiplier of 0 or more for every target.</p>{/if}
    </div>
    {#if statblock}
        <div class="panel-scroll statblock-pane">
            <label>Creature statblock<select value={statblock.id} on:change={(event) => statblock = $ordered.find((creature) => creature.id === event.currentTarget.value) ?? statblock}>
                {#each $ordered as creature (creature.id)}<option value={creature.id}>{creature.getName()}</option>{/each}
            </select></label>
            {#key statblock}<div class="inline-statblock" use:mountStatblock={statblock} />{/key}
        </div>
        <footer><button type="button" on:click={() => plugin.openCombatant(statblock, true)}>Open in pane</button>
            <button class="mod-cta" type="button" on:click={() => statblock = null}>Back to effect</button></footer>
    {:else}
        <footer class="updating-buttons"><button type="button" aria-label="Cancel" on:click={() => tracker.clearUpdate()}>Cancel</button><button class="mod-cta" type="button" aria-label="Apply" on:click={apply}>Apply effect</button></footer>
    {/if}
</div>
{/if}
<style>
.effect-panel { width: 560px; } .effect-modes,.condition-list,.condition-tools { display:flex;flex-wrap:wrap;gap:4px; }
.condition-choices { display:grid; grid-template-columns: repeat(auto-fit,minmax(min(100%,8rem),1fr)); gap:0.3rem; max-height:11rem; overflow:auto; }
.effect-fields { display:flex; flex-direction:column; gap:8px; }
.effect-fields[hidden] { display:none; }
.statblock-pane { display:grid; align-content:start; gap:0.6rem; }
.statblock-action { color:var(--text-muted); font-size:var(--font-ui-smaller); margin-left:0.25rem; }
.effect-modes [aria-pressed=true] { background:var(--interactive-accent);color:var(--text-on-accent); }
.updating-hp { display:flex;flex-direction:column;gap:10px; } label { display:flex;flex-direction:column;gap:4px; }
.inline,.target-choices label { flex-direction:row;align-items:center;gap:6px; }
.target-choices { max-height:180px;overflow:auto;padding:8px;border:1px solid var(--background-modifier-border);border-radius:6px; }
.input-status { display:flex;align-items:end;gap:8px; } .input-status label { flex:1;min-width:0; }
.effect-fields > * { flex-shrink:0; }
.target-table-scroll { overflow-x:auto; } table { width:100%;font-size:var(--font-ui-small);border-collapse:collapse; }
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
