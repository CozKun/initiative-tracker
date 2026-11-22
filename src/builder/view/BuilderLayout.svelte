<script lang="ts">
    import Encounter from "./encounter/Encounter.svelte";
    import Party from "./party/Party.svelte";
</script>

<div class="builder-width">
    <div class="builder-layout">
        <div class="encounter"><Encounter /></div>
        <div class="party"><Party /></div>
        <div class="bestiary"><slot /></div>
    </div>
</div>

<style>
    .builder-width { container-type: inline-size; }
    .builder-layout { display:grid; gap:1rem; align-items:start; }
    .builder-layout > div { min-width:0; }
    @container (min-width: 50rem) {
        .builder-layout {
            grid-template-columns:minmax(0, 1fr) minmax(15rem, 27%);
            grid-template-areas:"encounter party" "bestiary party";
        }
        .encounter { grid-area:encounter; }
        .party { grid-area:party; }
        .bestiary { grid-area:bestiary; }
    }
</style>
