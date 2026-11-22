<script lang="ts">
    import { createEventDispatcher, onMount, tick } from "svelte";
    import { popover } from "src/tracker/ui/popover";
    import { prefersTouchInput } from "src/tracker/ui/viewport";
    import { accessibleName } from "./tooltip";
    import NumberPad from "./NumberPad.svelte";

    export let label: string;
    export let value: string | number | number[] = "";
    export let showLabel = true;
    export let decimal = false;
    export let sign: "none" | "minus" | "both" = "none";
    export let allowEmpty = false;
    export let allowText = false;
    export let min = -Infinity;
    export let max = Infinity;
    export let placeholder = "Enter number";
    export let compact = false;

    const dispatch = createEventDispatcher<{ set: string }>();
    let wrapper: HTMLElement, anchor: HTMLButtonElement, panel: HTMLElement;
    let pad: NumberPad, textInput: HTMLInputElement;
    let touch = false, open = false, typing = false, replace = false, draft = "";
    $: display = Array.isArray(value) ? JSON.stringify(value) : String(value ?? "");
    $: numericDraft = isValidNumber(draft, decimal, sign, min, max);
    $: canSet = numericDraft || (typing ? !!draft.trim() : false) || (allowEmpty && !draft.trim());

    function isValidNumber(text: string, decimal: boolean, sign: string, min: number, max: number) {
        const number = Number(text);
        const prefix = sign === "both" ? "[+-]?" : sign === "minus" ? "-?" : "";
        const digits = decimal ? "(?:\\d+\\.?\\d*|\\.\\d+)" : "\\d+";
        return new RegExp(`^${prefix}${digits}$`).test(text) && Number.isFinite(number) &&
            Math.abs(number) <= Number.MAX_SAFE_INTEGER && number >= min && number <= max;
    }
    onMount(() => { touch = prefersTouchInput(wrapper.ownerDocument.defaultView); });

    async function begin() {
        draft = isValidNumber(display, decimal, sign, min, max) ? display : "";
        replace = true;
        typing = false;
        open = true;
        await tick();
        panel?.focus({ preventScroll: true });
    }
    async function useKeyboard() {
        if (!draft) draft = display;
        typing = true;
        await tick();
        textInput?.focus();
    }
    function close() { open = false; }
    function finish() {
        if (!canSet) return;
        const prefix = sign === "both" && draft[0] === "+" ? "+" : "";
        dispatch("set", numericDraft ? prefix + Number(draft) : draft.trim());
        close();
        anchor.focus({ preventScroll: true });
    }
    function keys(event: KeyboardEvent) {
        if (event.key === "Enter" && (event.target === panel || event.target === textInput)) {
            event.preventDefault();
            event.stopPropagation();
            finish();
        } else if (!typing) pad?.keydown(event);
    }
</script>

<span class="number-entry" class:compact bind:this={wrapper}>
    {#if showLabel}<span class="field-label">{label}</span>{/if}
    {#if touch}
        <button type="button" class="number-trigger" aria-label={label} aria-haspopup="dialog" aria-expanded={open} bind:this={anchor}
            on:click|stopPropagation={begin}>{display || placeholder}</button>
    {:else}
        <slot />
    {/if}
</span>

{#if open}
    <section class="coz-tracker-panel number-panel" role="dialog" tabindex="-1" bind:this={panel}
        use:accessibleName={label} use:popover={{anchor, close, placement:"top"}} on:keydown={keys}>
        <header><strong>{label}</strong><button type="button" aria-label="Close number entry" on:click={close}>×</button></header>
        {#if typing}
            <input aria-label={label} bind:this={textInput} bind:value={draft} />
        {:else}
            <output aria-label="Entered value">{draft || "—"}</output>
        {/if}
        <div class="panel-scroll">
            {#if !typing}<NumberPad bind:this={pad} bind:value={draft} bind:replace {decimal} {sign} />{/if}
            {#if allowText && !typing}<button class="keyboard-option" type="button" on:click={useKeyboard}>Enter text</button>{/if}
        </div>
        <footer><button type="button" on:click={close}>Cancel</button><button class="mod-cta" type="button" disabled={!canSet} on:click={finish}>Set</button></footer>
    </section>
{/if}

<style>
    .number-entry { display:grid; gap:0.3rem; min-width:0; }
    .number-trigger { width:100%; min-width:0; min-height:44px; text-align:left; justify-content:flex-start; overflow:hidden; text-overflow:ellipsis; }
    .compact .number-trigger { justify-content:center; text-align:center; padding-inline:0.3rem; }
    .number-panel { width:310px; z-index:calc(var(--layer-popover, 1000) + 1); }
    output { text-align:right; overflow-wrap:anywhere; font-weight:600; font-variant-numeric:tabular-nums;
        padding:0.45rem; background:var(--background-secondary); border-radius:var(--radius-s); }
    .keyboard-option { margin-top:0.35rem; }
</style>
