<script lang="ts">
    import { tweened } from "svelte/motion";
    import { cubicOut } from "svelte/easing";
    import { getContext } from "svelte";
    import { getRpgSystem } from "src/utils";
    import { dnd55DifficultyScale, type DifficultyBand } from "src/utils/difficulty-scale";
    import type InitiativeTracker from "src/main";

    import { tracker } from "../stores/tracker";
    const { difficulty, data } = tracker;

    const plugin: InitiativeTracker = getContext("plugin");

    const dif = difficulty(plugin);

    const difficultyBar = tweened(0, {
        duration: 400,
        easing: cubicOut
    });

    $: banded = $data.rpgSystem === "dnd5e-55";
    $: scale = banded ? dnd55DifficultyScale($dif.difficulty.value, $dif.thresholds) : null;
    $: maximum = $dif.thresholds[$dif.thresholds.length - 1]?.minValue ?? 0;
    $: ready = banded ? scale !== null : maximum > 0;
    $: difficultyBar.set(!ready ? 0 : banded ? scale.position / 100
        : Math.max(0, Math.min($dif.difficulty.value / maximum, 1)));
    $: summary = ready ? $dif.difficulty.summary : "Add enabled party members with levels to calculate difficulty.";
    $: formattedXp = getRpgSystem(plugin).formatDifficultyValue($dif.difficulty.value, true);
    function bandHelp(band: DifficultyBand) {
        return band.max === null
            ? `${band.name}: ${band.min.toLocaleString()} XP and above. High has no upper limit.`
            : `${band.name}: ${band.min.toLocaleString()} to below ${band.max.toLocaleString()} XP.`;
    }
</script>

{#if banded}
    <div class="difficulty-bands-container">
        <div class="difficulty-caption">
            <strong>{ready ? $dif.difficulty.displayName : "Add party levels"}</strong>
            <span>{formattedXp}</span>
        </div>
        {#if ready}
            <div class="difficulty-bands" role="meter" aria-label="Encounter difficulty"
                aria-valuemin="0" aria-valuemax="100" aria-valuenow={$difficultyBar * 100}
                aria-valuetext={`${$dif.difficulty.displayName}, ${formattedXp}. ${summary}`} title={summary}>
                {#each scale.bands as band}
                    <span class="difficulty-band" data-tier={band.name} style:width={`${band.width}%`}
                        title={bandHelp(band)} />
                {/each}
                <span class="difficulty-marker" style:left={`${$difficultyBar * 100}%`} aria-hidden="true" />
            </div>
            <div class="difficulty-legend" aria-label="Difficulty bands">
                {#each scale.bands as band}
                    <span title={bandHelp(band)}><i data-tier={band.name} aria-hidden="true" />{band.name}</span>
                {/each}
            </div>
        {:else}
            <div class="difficulty-empty" title={summary} />
        {/if}
    </div>
{:else}
<div class="difficulty-bar-container" aria-label={summary}>
    <span>{$dif.labels?.[0] ?? ""}</span>
    <span
        ><meter
            class="difficulty-bar"
            min="0"
            low="0.33"
            high="0.66"
            optimum="0"
            value={$difficultyBar}
        /></span
    >
    <span>{$dif.labels?.[$dif.labels.length - 1] ?? ""}</span>
</div>
{/if}

<style>
    .difficulty-bands-container { box-sizing: border-box; width: 100%; padding: 0 0.5rem; margin-bottom: 0.65rem; }
    .difficulty-caption { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.4rem;
        align-items: baseline; margin-bottom: 0.45rem; font-size: var(--font-ui-small); }
    .difficulty-caption span { color: var(--text-muted); }
    .difficulty-bands { display: flex; position: relative; width: 100%; height: 8px; border-radius: 4px; }
    .difficulty-band { display: block; border-right: 2px solid var(--background-primary); box-sizing: border-box; }
    .difficulty-band:first-child { border-radius: 4px 0 0 4px; }
    .difficulty-band:nth-child(4) { border-radius: 0 4px 4px 0; border-right: 0; }
    [data-tier="Trivial"] { background: var(--text-faint, #8b8b8b); }
    [data-tier="Low"] { background: var(--color-green, #60a96a); }
    [data-tier="Moderate"] { background: var(--color-yellow, #d5a33b); }
    [data-tier="High"] { background: var(--color-red, #d76868); }
    .difficulty-marker { position: absolute; top: -3px; bottom: -3px; width: 3px; transform: translateX(-50%);
        background: var(--text-normal); border: 1px solid var(--background-primary); border-radius: 2px;
        box-shadow: 0 0 0 1px var(--text-normal); pointer-events: none; }
    .difficulty-legend { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.35rem 0.55rem;
        margin-top: 0.45rem; color: var(--text-muted); font-size: var(--font-ui-smaller); }
    .difficulty-legend span { display: inline-flex; align-items: center; gap: 0.25rem; }
    .difficulty-legend i { width: 0.45rem; height: 0.45rem; border-radius: 50%; }
    .difficulty-empty { height: 8px; border-radius: 4px; background: var(--background-modifier-border); }
    .difficulty-bar-container {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 0.5rem;
        align-items: center;
        padding: 0 0.5rem;
        margin-bottom: 0.5rem;
        width: 100%;
    }
    .difficulty-bar {
        width: 100%;
        border: 1px solid #ccc;
        border-radius: 3px;
    }
</style>
