<script lang="ts">
    import { tooltip, accessibleName } from "src/ui/tooltip";
    import { onMount } from "svelte";
    import type { Creature } from "src/utils/creature";
    import { tracker } from "../stores/tracker";
    import { popover } from "./popover";

    export let session: { creature: Creature; anchor: HTMLElement };
    let amount = "";
    let heal = false;
    let input: HTMLInputElement;
    $: valid = /^\d+$/.test(amount) && Number.isSafeInteger(Number(amount)) && Number(amount) > 0;
    const close = () => tracker.quickHealth.set(null);
    const apply = () => {
        if (valid) tracker.applyQuickHealth(Number(amount), heal);
    };
    onMount(() => input.focus());
</script>

<section class="quick-health" role="dialog" use:accessibleName={`Health: ${session.creature.getName()}`}
    use:popover={{ anchor: session.anchor, close, placement: "side" }}
    on:click|stopPropagation on:pointerdown|stopPropagation>
    <div class="heading">
        {#if session.creature.baseColor}
            <span class="mini-colour" style:background-color={session.creature.baseColor}
                use:tooltip={`Mini Colour Indicator: ${session.creature.baseColor}`} />
        {/if}
        <strong>{session.creature.getName()}</strong>
        <button class="close" type="button" aria-label="Cancel health adjustment" data-tooltip-classes="coz-initiative-tooltip" on:click={close}>×</button>
    </div>
    <div class="health-modes">
        <button type="button" class:selected={!heal} aria-pressed={!heal}
            on:click={() => { heal = false; input.focus(); }}>Damage</button>
        <button type="button" class:selected={heal} aria-pressed={heal}
            on:click={() => { heal = true; input.focus(); }}>Heal</button>
    </div>
    <form on:submit|preventDefault={apply}>
        <input bind:this={input} bind:value={amount} type="text" inputmode="numeric"
            autocomplete="off" placeholder="Amount" aria-label={heal ? "Healing amount" : "Damage amount"} data-tooltip-classes="coz-initiative-tooltip" />
        <button type="submit" class="mod-cta" disabled={!valid}>{heal ? "Heal" : "Damage"}</button>
    </form>
    <button type="button" class="effect-link" on:click={() => tracker.openEffect(session.creature)}>Apply effect…</button>
</section>

<style>
    .quick-health { position: fixed; z-index: var(--layer-popover, 1000); box-sizing: border-box;
        width: 250px; overflow: auto; padding: 0.7rem; color: var(--text-normal);
        background: var(--background-primary); border: 1px solid var(--background-modifier-border);
        border-radius: var(--radius-m); box-shadow: var(--shadow-s); }
    .heading { display: flex; align-items: center; gap: 0.45rem; margin-bottom: 0.65rem; }
    .heading strong { flex: 1; overflow-wrap: anywhere; }
    .mini-colour { width: 0.8rem; height: 0.8rem; flex-shrink: 0; border-radius: 50%;
        border: 1px solid var(--background-modifier-border); }
    .close { padding: 0 0.4rem; box-shadow: none; background: transparent; font-size: 1.2rem; }
    .health-modes { display: flex; gap: 0.35rem; margin-bottom: 0.6rem; }
    .health-modes button { flex: 1; }
    .health-modes .selected { background: var(--interactive-accent); color: var(--text-on-accent); }
    form { display: flex; gap: 0.4rem; }
    input { min-width: 0; width: 100%; }
    .effect-link { margin-top: 0.6rem; padding: 0; height: auto; box-shadow: none;
        background: transparent; color: var(--text-muted); font-size: var(--font-ui-small); }
</style>
