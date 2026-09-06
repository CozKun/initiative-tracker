<script lang="ts">
    import { tooltip } from "src/ui/tooltip";
    import { setIcon } from "obsidian";
    import { convertFraction, FRIENDLY, getRpgSystem, HIDDEN } from "src/utils";
    import { encounter } from "../../stores/encounter";
    import { copyColours, type EncounterCreature } from "../../encounter-creatures";
    import MiniColourPicker from "src/ui/MiniColourPicker.svelte";
    import { getContext } from "svelte";
    import { Creature as CreatureCreator } from "src/utils/creature";

    const { players } = encounter;
    const { average, levels } = players;
    const plugin = getContext("plugin");
    const rpgSystem = getRpgSystem(plugin);
    export let count: number;
    export let creature: EncounterCreature;
    $: colours = copyColours(creature, count);
    $: perCreature = rpgSystem.getCreatureDifficulty(creature, $levels);
    $: insignificant = $levels.length > 0 && "cr" in creature && creature.cr != null && convertFraction(creature.cr) < $average - 3;
    $: challenge = $levels.length > 0 && "cr" in creature && creature.cr != null && convertFraction(creature.cr) > $average + 3;
    const icon = (node: HTMLElement, name: string) => { setIcon(node, name); return { update: (next: string) => setIcon(node, next) }; };
    const open = (event: MouseEvent) => plugin.openCombatant(CreatureCreator.from(creature), event.ctrlKey || event.metaKey);
    const toggle = (field: "friendly" | "hidden") => { creature[field] = !creature[field]; encounter.update(creature); };
</script>

<div class="encounter-creature-card">
    <div class="creature-heading">
        <button type="button" class="creature-name" use:tooltip={"Open creature details. Ctrl/Cmd-click opens a new pane."} on:click={open}>{creature.name}</button>
        <span class="quantity">×{count}</span>
        {#if insignificant}<span use:icon={"baby"} use:tooltip={"This creature's challenge rating is well below the average enabled party level."} />{/if}
        {#if challenge}<span use:icon={"skull"} use:tooltip={"This creature's challenge rating is well above the average enabled party level."} />{/if}
        <div class="row-actions">
            <button type="button" class="clickable-icon" class:selected={creature.hidden} aria-pressed={!!creature.hidden}
                use:tooltip={{ text: "Toggle visibility in the player view. Hidden enemies still count towards difficulty.", label: creature.hidden ? `Reveal ${creature.name} in player view` : `Hide ${creature.name} from player view` }} use:icon={HIDDEN} on:click={() => toggle("hidden")} />
            <button type="button" class="clickable-icon" class:selected={creature.friendly} aria-pressed={!!creature.friendly}
                use:tooltip={{ text: "Toggle ally status for this group. Allies are excluded from encounter difficulty.", label: creature.friendly ? `Make ${creature.name} an enemy` : `Make ${creature.name} an ally` }} use:icon={FRIENDLY} on:click={() => toggle("friendly")} />
            <button type="button" class="clickable-icon"  use:tooltip={{ text: "Remove this entire creature group from the encounter.", label: `Remove all ${creature.name}` }}
                use:icon={"trash-2"} on:click={() => encounter.delete(creature)} />
        </div>
    </div>
    <div class="creature-info">
        <div class="quantity-controls" aria-label={`${creature.name} quantity`} data-tooltip-classes="coz-initiative-tooltip">
            <button type="button" class="clickable-icon"  use:tooltip={{ text: "Remove the last copy, keeping the earlier copies and their colours.", label: `Remove last ${creature.name}` }}
                use:icon={"minus-circle"} on:click={() => encounter.remove(creature)} />
            <input type="number" min="1" step="1" value={count}
                use:tooltip={{ text: "Number of copies. Reducing this removes copies from the end.", label: `Number of ${creature.name}` }}
                on:change={(event) => { encounter.set(creature, Number(event.currentTarget.value)); event.currentTarget.value = String(count); }} />
            <button type="button" class="clickable-icon"  use:tooltip={{ text: "Add another copy with its own Mini Colour Indicator.", label: `Add another ${creature.name}` }}
                use:icon={"plus-circle"} on:click={() => encounter.add(creature)} />
        </div>
        <span class="stats" use:tooltip={"Difficulty value per creature, before any encounter adjustments."}>
            {#each rpgSystem.getAdditionalCreatureDifficultyStats(creature, $levels) as stat}<span>{stat}</span>{/each}
            <span>{rpgSystem.formatDifficultyValue(perCreature, true)} each</span>
            <span aria-hidden="true">·</span>
            <strong class="group-total" use:tooltip={creature.friendly
                ? "Total for this group before encounter adjustments. Allies are excluded from encounter difficulty."
                : "Per-creature value multiplied by the number of copies, before encounter adjustments."}>
                {rpgSystem.formatDifficultyValue(perCreature * count, true)} total
            </strong>
        </span>
        {#if creature.hidden}<span class="flag">Hidden</span>{/if}
        {#if creature.friendly}<span class="flag">Ally</span>{/if}
    </div>
    <div class="creature-copies" role="group" aria-label={`${creature.name} copies`} data-tooltip-classes="coz-initiative-tooltip">
        {#each colours as colour, index}
            <div class="creature-copy">
                <span>{creature.name} {index + 1}</span>
                <MiniColourPicker colour={colour ?? undefined} label={`Mini Colour Indicator: ${creature.name} ${index + 1}`}
                    onChange={(value) => encounter.setColour(creature, index, value)} />
                <button type="button" class="clickable-icon remove-copy"
                    use:tooltip={{ text: "Remove only this copy and its colour indicator.", label: `Remove ${creature.name} ${index + 1}` }} use:icon={"x"} on:click={() => encounter.remove(creature, index)} />
            </div>
        {/each}
    </div>
</div>

<style>
    .encounter-creature-card { border: 1px solid var(--background-modifier-border); border-radius: var(--radius-m); padding: 0.65rem; min-width: 0; }
    .creature-heading { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; }
    .creature-name { font-weight: 600; padding: 0; background: none; border: 0; box-shadow: none; text-align: left; white-space: normal; height: auto; }
    .quantity, .stats, .flag { color: var(--text-muted); font-size: var(--font-ui-smaller); }
    .row-actions { display: flex; margin-left: auto; gap: 0.25rem; }
    .creature-info { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin-top: 0.35rem; }
    .quantity-controls { display: flex; align-items: center; gap: 0.25rem; }
    input { text-align: center; width: 3rem; padding: 0.2rem; }
    .stats { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .group-total { color: var(--text-normal); font-weight: 500; }
    .flag { border: 1px solid var(--background-modifier-border); border-radius: 4px; padding: 0 0.3rem; }
    .creature-copies { margin: 0.55rem 0 0 0.5rem; padding-left: 0.65rem; border-left: 2px solid var(--background-modifier-border); }
    .creature-copy { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 0.7rem; align-items: center; padding: 0.3rem 0.35rem; font-size: var(--font-ui-small); }
    .creature-copy > span { overflow-wrap: anywhere; }
    .creature-copy + .creature-copy { border-top: 1px solid var(--background-modifier-border); }
    .clickable-icon { margin: 0; padding: 0.25rem; background: transparent; box-shadow: none; border: 0; height: auto; }
    .selected { color: var(--text-on-accent); background: var(--interactive-accent); }
    .remove-copy { color: var(--text-muted); }
</style>
