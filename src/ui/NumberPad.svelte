<script lang="ts">
    import { accessibleName } from "./tooltip";

    export let value = "";
    export let label = "Number keypad";
    export let decimal = false;
    export let sign: "none" | "minus" | "both" = "none";
    export let replace = false;

    const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
    function edit(key: string) {
        const current = replace ? "" : value;
        replace = false;
        if (key === "Clear") value = "";
        else if (key === "Backspace") value = value.slice(0, -1);
        else if (key === "+" || key === "-") value = current.startsWith(key) ? current.slice(1) : key + current.replace(/^[+-]/, "");
        else if (key !== "." || !current.includes(".")) {
            if (current.length < 24) value = (current + key).replace(/^([+-]?)0+(?=\d)/, "$1");
        }
    }

    export function keydown(event: KeyboardEvent) {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        const key = event.key;
        if (!/^\d$/.test(key) && key !== "Backspace" && key !== "Delete" &&
            !(key === "." && decimal) && !(key === "-" && sign !== "none") && !(key === "+" && sign === "both")) return;
        edit(key === "Delete" ? "Clear" : key);
        event.preventDefault();
        event.stopPropagation();
    }
</script>

<div class="keypad" role="group" use:accessibleName={label}>
    {#each digits as digit}<button type="button" on:click={() => edit(digit)}>{digit}</button>{/each}
    <button type="button" on:click={() => edit("Clear")} disabled={!value}>Clear</button>
    <button type="button" on:click={() => edit("0")}>0</button>
    <button type="button" aria-label="Delete last digit" on:click={() => edit("Backspace")} disabled={!value}>⌫</button>
    {#if decimal}<button type="button" aria-label="Decimal point" on:click={() => edit(".")}>.</button>{/if}
    {#if sign !== "none"}<button type="button" aria-label="Minus sign" on:click={() => edit("-")}>−</button>{/if}
    {#if sign === "both"}<button type="button" aria-label="Plus sign" on:click={() => edit("+")}>+</button>{/if}
</div>

<style>
    .keypad { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:0.3rem; }
    .keypad button { min-width:0; min-height:44px; font-size:1rem; padding-inline:0.25rem; }
</style>
