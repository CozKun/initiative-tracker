<script lang="ts">
    import { tooltip, accessibleName } from "src/ui/tooltip";
    import { onMount } from "svelte";
    import { Platform } from "obsidian";
    import type { Creature } from "src/utils/creature";
    import { tracker } from "../stores/tracker";
    import { popover } from "./popover";

    export let session: { creature: Creature; anchor: HTMLElement };
    let amount = "";
    let heal = false;
    let input: HTMLInputElement;
    let panel: HTMLElement;
    const touch = Platform.isMobile || session.anchor.ownerDocument.defaultView?.matchMedia("(pointer: coarse)").matches;
    const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
    $: valid = /^\d+$/.test(amount) && Number.isSafeInteger(Number(amount)) && Number(amount) > 0;
    const close = () => tracker.quickHealth.set(null);
    const apply = () => {
        if (valid) tracker.applyQuickHealth(Number(amount), heal);
    };
    function enterDigit(digit: string) {
        const next = (amount + digit).replace(/^0+(?=\d)/, "");
        if (Number.isSafeInteger(Number(next))) amount = next;
    }
    function keypadKeys(event: KeyboardEvent) {
        if (!touch || event.altKey || event.ctrlKey || event.metaKey) return;
        if (/^\d$/.test(event.key)) enterDigit(event.key);
        else if (event.key === "Backspace") amount = amount.slice(0, -1);
        else if (event.key === "Enter" && event.target === panel) apply();
        else return;
        event.preventDefault();
        event.stopPropagation();
    }
    onMount(() => {
        if (touch) panel.focus({ preventScroll: true });
        else input.focus();
    });
</script>

<section bind:this={panel} class="quick-health" class:touch role="dialog" tabindex="-1" use:accessibleName={`Health: ${session.creature.getName()}`}
    use:popover={{ anchor: session.anchor, close, placement: "side" }}
    on:click|stopPropagation on:pointerdown|stopPropagation on:keydown={keypadKeys}>
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
            on:click={() => { heal = false; input?.focus(); }}>Damage</button>
        <button type="button" class:selected={heal} aria-pressed={heal}
            on:click={() => { heal = true; input?.focus(); }}>Heal</button>
    </div>
    <form on:submit|preventDefault={apply}>
        {#if touch}
            <output aria-label={heal ? "Healing amount" : "Damage amount"}>{amount || "0"}</output>
        {:else}
            <input bind:this={input} bind:value={amount} type="text" inputmode="numeric"
                autocomplete="off" placeholder="Amount" aria-label={heal ? "Healing amount" : "Damage amount"} data-tooltip-classes="coz-initiative-tooltip" />
        {/if}
        <button type="submit" class="mod-cta" disabled={!valid}>{heal ? "Heal" : "Damage"}</button>
    </form>
    {#if touch}
        <div class="keypad" role="group" use:accessibleName={"Health keypad"}>
            {#each digits as digit}
                <button type="button" on:click={() => enterDigit(digit)}>{digit}</button>
            {/each}
            <button type="button" on:click={() => amount = ""} disabled={!amount}>Clear</button>
            <button type="button" on:click={() => enterDigit("0")}>0</button>
            <button type="button" aria-label="Delete last digit" on:click={() => amount = amount.slice(0, -1)} disabled={!amount}>⌫</button>
        </div>
    {/if}
    <button type="button" class="effect-link" on:click={() => tracker.openEffect(session.creature)}>Apply effect…</button>
</section>

<style>
    .quick-health { position: fixed; z-index: var(--layer-popover, 1000); box-sizing: border-box;
        width: 250px; overflow: auto; padding: 0.7rem; color: var(--text-normal);
        background: var(--background-primary); border: 1px solid var(--background-modifier-border);
        border-radius: var(--radius-m); box-shadow: var(--shadow-s); }
    .quick-health.touch { width: min(310px, calc(100vw - 16px)); overscroll-behavior: contain; }
    .quick-health.touch:focus { outline: none; }
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
    output { flex: 1; min-width: 0; display: grid; align-items: center; text-align: right; overflow-wrap: anywhere;
        padding: 0.2rem 0.55rem; font-weight: 600; font-variant-numeric: tabular-nums;
        background: var(--background-secondary); border-radius: var(--radius-s); }
    .touch button { min-height: 44px; }
    .keypad { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.3rem; margin-top: 0.65rem; }
    .keypad button { min-width: 0; font-size: 1rem; padding-inline: 0.25rem; }
    .effect-link { margin-top: 0.6rem; padding: 0; height: auto; box-shadow: none;
        background: transparent; color: var(--text-muted); font-size: var(--font-ui-small); }
</style>
