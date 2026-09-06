<script lang="ts">
    import { tooltip } from "src/ui/tooltip";
    import { encounter } from "../../stores/encounter";
    import { players } from "../../stores/players";
    import { getRpgSystem } from "src/utils";
    import { getContext } from "svelte";
    import DifficultyGauge from "src/ui/DifficultyGauge.svelte";

    const plugin = getContext("plugin");
    const rpgSystem = getRpgSystem(plugin);
    const { levels } = players;
    let open = plugin.data.builder.showXP;
    $: enc = new Map([...$encounter].filter(([creature]) => !creature.friendly));
    $: filtered = [...$encounter].reduce((sum, [creature, count]) => sum + (creature.friendly ? count : 0), 0);
    $: difficulty = rpgSystem.getEncounterDifficulty(enc, $levels);
    $: thresholds = rpgSystem.getDifficultyThresholds($levels);
    $: formattedXp = rpgSystem.formatDifficultyValue(difficulty.value, true);
    const rememberOpen = (event: Event) => {
        const next = (event.currentTarget as HTMLDetailsElement).open;
        if (plugin.data.builder.showXP !== next) {
            plugin.data.builder.showXP = next;
            void plugin.saveSettings();
        }
    };
</script>

<section class="builder-difficulty" aria-label="Encounter difficulty summary" data-tooltip-classes="coz-initiative-tooltip">
    <div class="section-heading"><h5>Encounter difficulty</h5><span>{rpgSystem.displayName}</span></div>
    {#if plugin.data.rpgSystem !== "dnd5e-55"}
        <div class="difficulty-summary" use:tooltip={difficulty.summary}>
            <strong>{$levels.length ? difficulty.displayName : "Add party levels"}</strong><span>{formattedXp}</span>
        </div>
    {/if}
    <DifficultyGauge {difficulty} {thresholds} system={plugin.data.rpgSystem}
        labels={thresholds.map((threshold) => threshold.displayName)} {formattedXp} />
    <p class="party-context" use:tooltip={"Only enabled players with a level count towards the party's difficulty thresholds. Allied creatures are excluded; hidden enemies still count."}>
        {$levels.length} enabled player{$levels.length === 1 ? "" : "s"}{#if filtered} · {filtered} allied creature{filtered === 1 ? "" : "s"} excluded{/if}
    </p>
    <details bind:open on:toggle={rememberOpen}>
        <summary use:tooltip={"Show the party's difficulty thresholds and calculation details."}>Party budgets</summary>
        <div class="thresholds">
            {#each thresholds as budget}
                <div use:tooltip={`The ${budget.displayName} threshold for all enabled players combined.`}>
                    <span>{budget.displayName}</span><strong>{rpgSystem.formatDifficultyValue(budget.minValue, true)}</strong>
                </div>
            {/each}
        </div>
        {#each difficulty.intermediateValues as intermediate}
            <p class="calculation">{intermediate.label}: {intermediate.value.toLocaleString()}</p>
        {/each}
        {#each rpgSystem.getAdditionalDifficultyBudgets($levels) as budget}
            <p class="calculation">{budget.displayName}: {rpgSystem.formatDifficultyValue(budget.minValue, true)}</p>
        {/each}
        {#if plugin.data.rpgSystem === "dnd5e-55"}
            <p class="explanation">Uses enemy XP without a creature-count multiplier. The bands show difficulty tiers; High has no upper XP limit.</p>
        {/if}
    </details>
</section>

<style>
    .builder-difficulty { min-width: 0; }
    .section-heading, .difficulty-summary { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 0.4rem; }
    h5 { margin: 0 0 0.75rem; }
    .section-heading span, .party-context, .explanation { color: var(--text-muted); font-size: var(--font-ui-smaller); }
    .party-context { margin: 0.3rem 0 0.8rem; }
    .difficulty-summary { margin-bottom: 0.5rem; }
    summary { cursor: pointer; font-size: var(--font-ui-small); width: fit-content; }
    .thresholds { display: grid; grid-template-columns: repeat(auto-fit, minmax(65px, 1fr)); gap: 0.5rem; margin-top: 0.65rem; }
    .thresholds > div { display: flex; flex-direction: column; gap: 0.25rem; padding: 0.5rem; border-radius: var(--radius-s); background: var(--background-secondary); }
    .thresholds span { color: var(--text-muted); font-size: var(--font-ui-smaller); }
    .calculation, .explanation { margin: 0.6rem 0 0; }
</style>
