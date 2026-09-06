<script lang="ts">
    import Experience from "./Experience.svelte";
    import Party from "./Party.svelte";
</script>

<div class="player-component-container">
    <div class="players-xp">
        <Party />
        <Experience />
    </div>
</div>

<style scoped>
    .players-xp {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 1.5rem; margin-bottom: 1.25rem;
    }
</style>
