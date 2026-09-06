<script lang="ts">
    import type { Creature } from "src/utils/creature";
    import { tracker } from "src/tracker/stores/tracker";
    import MiniColourPicker from "src/ui/MiniColourPicker.svelte";
    export let creature: Creature;
</script>

<MiniColourPicker colour={creature.baseColor}
    onChange={(baseColor) => tracker.updateCreatures({ creature, change: { baseColor } })} />
