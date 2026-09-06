<script lang="ts">
    import { getContext } from "svelte";
    import { getRpgSystem } from "src/utils";
    import type InitiativeTracker from "src/main";
    import DifficultyGauge from "src/ui/DifficultyGauge.svelte";
    import { tracker } from "../stores/tracker";
    const plugin = getContext<InitiativeTracker>("plugin");
    const { data } = tracker;
    const dif = tracker.difficulty(plugin);
</script>

<DifficultyGauge difficulty={$dif.difficulty} thresholds={$dif.thresholds} labels={$dif.labels}
    system={$data.rpgSystem} formattedXp={getRpgSystem(plugin).formatDifficultyValue($dif.difficulty.value, true)} />
