<script lang="ts">
    import { setIcon } from "obsidian";
    import type { Creature } from "src/utils/creature";
    import { tracker } from "src/tracker/stores/tracker";
    import { tick } from "svelte";

    export let creature: Creature;

    let open = false;
    let anchor: HTMLButtonElement;
    let pickerLeft = 0;
    let pickerTop = 0;
    let hue = 0;
    let saturation = 0;
    let value = 0.5;
    let draft = "#808080";

    const clamp = (number: number) => Math.min(1, Math.max(0, number));

    function hsvToHex(h: number, s: number, v: number) {
        const chroma = v * s;
        const segment = h / 60;
        const intermediate = chroma * (1 - Math.abs((segment % 2) - 1));
        let [red, green, blue] = [0, 0, 0];

        if (segment < 1) [red, green] = [chroma, intermediate];
        else if (segment < 2) [red, green] = [intermediate, chroma];
        else if (segment < 3) [green, blue] = [chroma, intermediate];
        else if (segment < 4) [green, blue] = [intermediate, chroma];
        else if (segment < 5) [red, blue] = [intermediate, chroma];
        else [red, blue] = [chroma, intermediate];

        const match = v - chroma;
        return `#${[red, green, blue]
            .map((channel) =>
                Math.round((channel + match) * 255)
                    .toString(16)
                    .padStart(2, "0")
            )
            .join("")}`.toUpperCase();
    }

    function hexToHsv(hex: string) {
        const [red, green, blue] = hex
            .slice(1)
            .match(/.{2}/g)
            .map((channel) => parseInt(channel, 16) / 255);
        const max = Math.max(red, green, blue);
        const min = Math.min(red, green, blue);
        const delta = max - min;
        let nextHue = 0;

        if (delta) {
            if (max == red) nextHue = 60 * (((green - blue) / delta) % 6);
            else if (max == green)
                nextHue = 60 * ((blue - red) / delta + 2);
            else nextHue = 60 * ((red - green) / delta + 4);
        }

        return {
            hue: nextHue < 0 ? nextHue + 360 : nextHue,
            saturation: max ? delta / max : 0,
            value: max
        };
    }

    function setDraft(hex: string) {
        const normalized = hex.toUpperCase();
        if (!/^#[0-9A-F]{6}$/.test(normalized)) return;
        draft = normalized;
        ({ hue, saturation, value } = hexToHsv(normalized));
    }

    function updateDraft() {
        draft = hsvToHex(hue, saturation, value);
    }

    function openPicker() {
        if (open) {
            open = false;
            return;
        }

        setDraft(creature.baseColor ?? "#808080");
        const bounds = anchor.getBoundingClientRect();
        const width = 210;
        const height = 190;
        pickerLeft = Math.max(
            8,
            Math.min(bounds.left, window.innerWidth - width - 8)
        );
        pickerTop =
            bounds.bottom + height + 8 <= window.innerHeight
                ? bounds.bottom + 4
                : Math.max(8, bounds.top - height - 4);
        open = true;
    }

    function updateSaturationAndValue(evt: PointerEvent) {
        const element = evt.currentTarget as HTMLElement;
        const bounds = element.getBoundingClientRect();
        saturation = clamp((evt.clientX - bounds.left) / bounds.width);
        value = 1 - clamp((evt.clientY - bounds.top) / bounds.height);
        updateDraft();
    }

    function beginSaturationAndValue(evt: PointerEvent) {
        evt.preventDefault();
        (evt.currentTarget as HTMLElement).setPointerCapture(evt.pointerId);
        updateSaturationAndValue(evt);
    }

    function moveSaturationAndValue(evt: PointerEvent) {
        if (
            (evt.currentTarget as HTMLElement).hasPointerCapture(evt.pointerId)
        ) {
            updateSaturationAndValue(evt);
        }
    }

    function updateHue(evt: Event) {
        hue = Number((evt.currentTarget as HTMLInputElement).value);
        updateDraft();
    }

    function updateHex(evt: Event) {
        setDraft((evt.currentTarget as HTMLInputElement).value);
    }

    async function apply() {
        const color = draft;
        open = false;
        await tick();
        tracker.updateCreatures({
            creature,
            change: { baseColor: color }
        });
    }

    function closeOnOutside(node: HTMLElement) {
        const close = (evt: PointerEvent) => {
            const target = evt.target as Node;
            if (!node.contains(target) && !anchor.contains(target)) {
                open = false;
            }
        };
        document.addEventListener("pointerdown", close, true);
        return {
            destroy() {
                document.removeEventListener("pointerdown", close, true);
            }
        };
    }

    function portal(node: HTMLElement) {
        document.body.appendChild(node);
    }

    const checkIcon = (node: HTMLElement) => setIcon(node, "check");
    const cancelIcon = (node: HTMLElement) => setIcon(node, "x");
</script>

<div class="base-colour-picker">
    <button
        bind:this={anchor}
        type="button"
        class="base-colour-swatch"
        class:unset={!creature.baseColor}
        style:background-color={creature.baseColor ?? "transparent"}
        title={creature.baseColor
            ? `Mini base colour: ${creature.baseColor}`
            : "Set mini base colour"}
        aria-label="Set mini base colour"
        aria-haspopup="dialog"
        aria-expanded={open}
        on:pointerdown|stopPropagation
        on:click|stopPropagation={openPicker}
    />

    {#if open}
        <div
            class="picker"
            role="dialog"
            aria-label="Mini base colour picker"
            style={`left:${pickerLeft}px; top:${pickerTop}px;`}
            use:portal
            use:closeOnOutside
            on:pointerdown|stopPropagation
            on:click|stopPropagation
            on:contextmenu|stopPropagation
        >
            <div
                class="saturation-value"
                style:background={`linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%))`}
                on:pointerdown={beginSaturationAndValue}
                on:pointermove={moveSaturationAndValue}
            >
                <span
                    class="selection"
                    style={`left:${saturation * 100}%; top:${
                        (1 - value) * 100
                    }%;`}
                />
            </div>

            <input
                class="hue"
                type="range"
                min="0"
                max="359"
                value={hue}
                aria-label="Hue"
                on:input={updateHue}
            />

            <div class="picker-footer">
                <span
                    class="preview"
                    style:background-color={draft}
                    aria-hidden="true"
                />
                <input
                    class="hex"
                    type="text"
                    value={draft}
                    maxlength="7"
                    aria-label="Hex colour"
                    on:change={updateHex}
                />
                <button
                    type="button"
                    class="clickable-icon"
                    title="Apply colour"
                    aria-label="Apply colour"
                    use:checkIcon
                    on:click={apply}
                />
                <button
                    type="button"
                    class="clickable-icon"
                    title="Cancel"
                    aria-label="Cancel"
                    use:cancelIcon
                    on:click={() => (open = false)}
                />
            </div>
        </div>
    {/if}
</div>

<style>
    .base-colour-picker {
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }
    .base-colour-swatch {
        width: 1rem;
        height: 1rem;
        min-width: 1rem;
        min-height: 1rem;
        margin: 0;
        padding: 0;
        border: 1px solid var(--background-modifier-border);
        border-radius: 50%;
        box-shadow: none;
        cursor: pointer;
    }
    .base-colour-swatch.unset {
        border-style: dashed;
    }
    .picker {
        position: fixed;
        z-index: var(--layer-popover, 1000);
        box-sizing: border-box;
        width: 210px;
        padding: 0.6rem;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: var(--radius-m);
        box-shadow: var(--shadow-s);
    }
    .saturation-value {
        position: relative;
        width: 100%;
        height: 112px;
        border-radius: var(--radius-s);
        cursor: crosshair;
        touch-action: none;
    }
    .selection {
        position: absolute;
        width: 0.75rem;
        height: 0.75rem;
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.7);
        pointer-events: none;
        transform: translate(-50%, -50%);
    }
    .hue {
        width: 100%;
        height: 0.75rem;
        margin: 0.6rem 0;
        padding: 0;
        background: linear-gradient(
            to right,
            #f00,
            #ff0,
            #0f0,
            #0ff,
            #00f,
            #f0f,
            #f00
        );
        border: 0;
        border-radius: var(--radius-s);
        appearance: none;
    }
    .hue::-webkit-slider-thumb {
        width: 0.85rem;
        height: 0.85rem;
        background: var(--background-primary);
        border: 2px solid var(--text-normal);
        border-radius: 50%;
        cursor: pointer;
        appearance: none;
    }
    .picker-footer {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto auto;
        gap: 0.35rem;
        align-items: center;
    }
    .preview {
        width: 1rem;
        height: 1rem;
        border: 1px solid var(--background-modifier-border);
        border-radius: 50%;
    }
    .hex {
        width: 100%;
        height: 1.8rem;
        min-width: 0;
        padding: 0 0.35rem;
        font-family: var(--font-monospace);
        font-size: var(--font-ui-smaller);
    }
    .picker-footer .clickable-icon {
        margin: 0;
    }
</style>
