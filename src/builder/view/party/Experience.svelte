<script lang="ts">
    import { tracker } from "src/tracker/stores/tracker";
    import { accessibleName } from "src/ui/tooltip";
    import { encounter } from "../../stores/encounter";
    import { players } from "../../stores/players";
    import { getRpgSystem } from "src/utils";
    import { getContext } from "svelte";
    import DifficultyGauge from "src/ui/DifficultyGauge.svelte";

    const plugin = getContext("plugin");
    const { data } = tracker;
    $: rpgSystem = getRpgSystem(plugin, $data.rpgSystem);
    const { levels } = players;
    $: enc = new Map([...$encounter].filter(([creature]) => !creature.friendly));
    $: filtered = [...$encounter].reduce((sum, [creature, count]) => sum + (creature.friendly ? count : 0), 0);
    $: difficulty = rpgSystem.getEncounterDifficulty(enc, $levels);
    $: thresholds = rpgSystem.getDifficultyThresholds($levels);
    $: formattedXp = rpgSystem.formatDifficultyValue(difficulty.value, true);
    $: additional = rpgSystem.getAdditionalDifficultyBudgets($levels);
</script>

<section class="builder-difficulty" use:accessibleName={"Encounter difficulty summary"}>
    <div class="section-heading"><h3 class="builder-section-heading">Encounter difficulty</h3><span>{rpgSystem.displayName}</span></div>
    <DifficultyGauge detailed {difficulty} {thresholds} system={ $data.rpgSystem}
        labels={rpgSystem.systemDifficulties} unit={rpgSystem.valueUnit} {formattedXp}>
        <svelte:fragment slot="details">{#if additional.length}
            <dl>{#each additional as budget}
                <div><dt>{budget.displayName}</dt><dd>{budget.unit ? `${budget.minValue.toLocaleString()} ${budget.unit}` : rpgSystem.formatDifficultyValue(budget.minValue, true)}</dd></div>
            {/each}</dl>
        {/if}</svelte:fragment>
    </DifficultyGauge>
    <p class="party-context">
        {$levels.length} enabled player{$levels.length === 1 ? "" : "s"}{#if filtered} Â· {filtered} allied creature{filtered === 1 ? "" : "s"} excluded{/if}
    </p>
</section>

<style>
    .builder-difficulty { min-width:0; padding:0.75rem; border:1px solid var(--background-modifier-border); border-radius:var(--radius-m); background:var(--background-secondary); }
    .section-heading { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 0.4rem; }
    .section-heading { margin-bottom: 0.75rem; }
    .section-heading span, .party-context { color:var(--text-muted); font-size:var(--font-ui-smaller); }
    .party-context { margin:0; }
    dl { margin:0.5rem 0 0; font-size:var(--font-ui-small); }
    dl div { display:flex; justify-content:space-between; gap:0.5rem; }
    dd { margin:0; }
    .builder-difficulty :global(.difficulty-bands-container) { padding:0; }
</style>
