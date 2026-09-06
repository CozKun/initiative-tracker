<script lang="ts">
    import { tooltip } from "src/ui/tooltip";
    import { tweened } from "svelte/motion";
    import { cubicOut } from "svelte/easing";
    import { dnd55DifficultyScale, type DifficultyBand } from "src/utils/difficulty-scale";
    import type { DifficultyLevel, DifficultyThreshold } from "src/utils/rpg-system";

    export let difficulty: DifficultyLevel;
    export let thresholds: DifficultyThreshold[];
    export let labels: string[] = [];
    export let system: string;
    export let formattedXp: string;
    const difficultyBar = tweened(0, { duration: 400, easing: cubicOut });
    $: banded = system === "dnd5e-55";
    $: scale = banded ? dnd55DifficultyScale(difficulty.value, thresholds) : null;
    $: maximum = thresholds[thresholds.length - 1]?.minValue ?? 0;
    $: ready = banded ? scale !== null : maximum > 0;
    $: difficultyBar.set(!ready ? 0 : banded ? scale.position / 100
        : Math.max(0, Math.min(difficulty.value / maximum, 1)));
    $: summary = ready ? difficulty.summary : "Add enabled party members with levels to calculate difficulty.";
    function bandHelp(band: DifficultyBand) {
        return band.max === null
            ? `${band.name}: ${band.min.toLocaleString()} XP and above. High has no upper limit.`
            : `${band.name}: ${band.min.toLocaleString()} to below ${band.max.toLocaleString()} XP.`;
    }
    function bandRange(band: DifficultyBand) {
        return band.max === null ? `${band.min.toLocaleString()}+ XP`
            : `${band.min.toLocaleString()}–<${band.max.toLocaleString()} XP`;
    }
</script>

{#if banded}
    <div class="difficulty-bands-container">
        <div class="difficulty-caption">
            <strong>{ready ? difficulty.displayName : "Add party levels"}</strong>
            <span>{formattedXp}</span>
        </div>
        {#if ready}
            <div class="difficulty-bands" role="meter"
                aria-valuemin="0" aria-valuemax="100" aria-valuenow={$difficultyBar * 100}
                aria-valuetext={`${difficulty.displayName}, ${formattedXp}. ${summary}`} use:tooltip={{ text: summary, label: "Encounter difficulty" }}>
                {#each scale.bands as band}
                    <span class="difficulty-band" data-tier={band.name} style:width={`${band.width}%`}
                        use:tooltip={bandHelp(band)} />
                {/each}
                <span class="difficulty-marker" style:left={`${$difficultyBar * 100}%`} aria-hidden="true" />
            </div>
            <div class="difficulty-legend" aria-label="Difficulty bands" data-tooltip-classes="coz-initiative-tooltip">
                {#each scale.bands as band}
                    <span class="legend-item" class:current={scale.current.name === band.name} use:tooltip={bandHelp(band)}>
                        <span class="legend-name"><i data-tier={band.name} aria-hidden="true" />{band.name}</span>
                        <small>{bandRange(band)}</small>
                    </span>
                {/each}
            </div>
            <div class="difficulty-distance" aria-label="XP to neighbouring difficulty brackets" data-tooltip-classes="coz-initiative-tooltip">
                <span class="next-bracket">{#if scale.next}<strong>{scale.next.add.toLocaleString()} XP</strong> to {scale.next.name}{:else}Highest bracket{/if}</span>
                <span class="previous-bracket">{#if scale.previous}Remove <strong>{scale.previous.remove.toLocaleString()} XP</strong> for {scale.previous.name}{:else}Lowest bracket{/if}</span>
            </div>
        {:else}
            <div class="difficulty-empty" use:tooltip={summary} />
        {/if}
    </div>
{:else}
<div class="difficulty-bar-container" aria-label={summary} data-tooltip-classes="coz-initiative-tooltip">
    <span>{labels?.[0] ?? ""}</span>
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
    <span>{labels?.[labels.length - 1] ?? ""}</span>
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
    .difficulty-legend { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.35rem;
        margin-top: 0.45rem; color: var(--text-muted); font-size: var(--font-ui-smaller); }
    .legend-item { display: flex; flex-direction: column; gap: 0.2rem; padding-bottom: 0.25rem; border-bottom: 2px solid transparent; }
    .legend-item.current { color: var(--text-normal); border-bottom-color: var(--text-muted); }
    .legend-name { display: inline-flex; align-items: center; gap: 0.25rem; }
    .legend-item small { font-family: inherit; font-size: 0.9em; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
    .difficulty-legend i { width: 0.45rem; height: 0.45rem; border-radius: 50%; }
    .difficulty-distance { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.3rem 0.7rem; margin-top: 0.5rem;
        color: var(--text-muted); font-size: var(--font-ui-smaller); }
    .difficulty-distance strong { color: var(--text-normal); font-weight: 500; }
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
