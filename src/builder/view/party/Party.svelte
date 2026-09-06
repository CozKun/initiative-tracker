<script lang="ts">
    import { tooltip } from "src/ui/tooltip";
    import { setIcon } from "obsidian";
    import { getContext } from "svelte";
    import { get } from "svelte/store";
    import { players } from "../../stores/players";

    const { party, generics, levels } = players;
    const plugin = getContext("plugin");
    const parties = plugin.data.parties;
    let open = plugin.data.builder.showParty ?? true;
    const partyMembers = (name: string) => plugin.getPlayersForParty(name).map((player) => ({
        ...player.creature, name: player.name, level: player.level,
        isPlayer: true as const, enabled: true, count: 1
    }));
    if (!get(players).length) {
        partyMembers(plugin.data.defaultParty).forEach((player) => players.add(player));
    }
    $: selectedParty = parties.find((entry) => entry.players.length === $party.length &&
        entry.players.every((name) => $party.some((player) => player.name === name)))?.name ?? "";
    const rememberOpen = (event: Event) => {
        const expanded = (event.currentTarget as HTMLDetailsElement).open;
        if (plugin.data.builder.showParty !== expanded) {
            plugin.data.builder.showParty = expanded;
            void plugin.saveSettings();
        }
    };
    const add = () => players.add({ isPlayer: false, level: 1, count: 1, enabled: true });
    const icon = (node: HTMLElement, name: string) => setIcon(node, name);
</script>

<section class="builder-party" aria-label="Encounter party" data-tooltip-classes="coz-initiative-tooltip">
    <details class="party-panel" bind:open on:toggle={rememberOpen}>
        <summary use:tooltip={{ text: "Expand or collapse the party section.", label: "Party" }}>
            <h5>Party</h5>
            <span class="party-count">{$levels.length} included</span>
            <span class="chevron" class:expanded={open} use:icon={"chevron-right"} aria-hidden="true" />
        </summary>
        <div class="party-content">
            {#if parties.length}
                <label class="party-selector">
                    <span>Saved party</span>
                    <select value={selectedParty}
                        use:tooltip={{ text: "Choose named characters from a saved party. Any unnamed player groups stay in place.", label: "Select a party" }}
                        on:change={(event) => players.switchParty(event.currentTarget.value ? partyMembers(event.currentTarget.value) : [])}>
                        <option value="">Custom / unnamed party</option>
                        {#each parties as entry}<option value={entry.name}>{entry.name}</option>{/each}
                    </select>
                </label>
            {/if}
            <div class="players">
                {#each $party as player (player.name)}
                    <div class="player-card named-player" class:excluded={!player.enabled}>
                        <input type="checkbox" checked={player.enabled}
                            use:tooltip={{ text: `Include ${player.name} in the party's difficulty calculation.`, label: player.enabled ? "Exclude from encounter difficulty" : "Include in encounter difficulty" }}
                            on:change={() => players.toggleEnabled(player)} />
                        <span class="player-name">{player.name}</span>
                        <span class="level-badge" use:tooltip={"Character level used for encounter difficulty."}>Level {player.level}</span>
                    </div>
                {/each}
                {#each $generics as player, index}
                    <div class="player-card generic-player" class:excluded={!player.enabled}>
                        <input type="checkbox" checked={player.enabled}
                            use:tooltip={{ text: "Include this group in the party's difficulty calculation.", label: player.enabled ? "Exclude from encounter difficulty" : "Include in encounter difficulty" }}
                            on:change={() => players.toggleEnabled(player)} />
                        <label class="number-field"><span>Players</span>
                            <input type="number" value={player.count} min="1" step="1"
                                use:tooltip={{ text: "How many players of this level to include in the difficulty calculation.", label: `Number of players in group ${index + 1}` }}
                                on:input={(event) => players.set(player, Number(event.currentTarget.value))} />
                        </label>
                        <label class="number-field"><span>Level</span>
                            <input type="number" value={player.level} min="1" step="1"
                                use:tooltip={{ text: "Level of each player in this group.", label: `Level of player group ${index + 1}` }}
                                on:input={(event) => players.setLevel(player, Number(event.currentTarget.value))} />
                        </label>
                        <button type="button" class="remove-player clickable-icon"
                            use:tooltip={{ text: "Remove this group of unnamed players.", label: "Remove this player group" }} use:icon={"x"} on:click={() => players.remove(player)} />
                    </div>
                {/each}
            </div>
            {#if !$players.length}<p class="empty-party">Choose a party or add players to calculate difficulty.</p>{/if}
            <button type="button" class="add-players"
                use:tooltip={{ text: "Add a group of players at the same level for encounter planning.", label: "Add unnamed players" }} on:click={add}>
                <span use:icon={"plus"} aria-hidden="true" /> Add players
            </button>
        </div>
    </details>
</section>

<style>
    .builder-party { min-width: 0; }
    summary { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; list-style: none; margin-bottom: 0.75rem; }
    summary::-webkit-details-marker { display: none; }
    h5 { margin: 0; font-size: var(--font-ui-small); }
    .party-count { margin-left: auto; color: var(--text-muted); font-size: var(--font-ui-smaller); }
    .chevron { display: flex; color: var(--text-muted); transition: transform 0.15s; }
    .chevron.expanded { transform: rotate(90deg); }
    .party-content, .players { display: flex; flex-direction: column; gap: 0.5rem; }
    .party-selector { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; font-size: var(--font-ui-smaller); color: var(--text-muted); }
    select { flex: 1; min-width: 0; max-width: 100%; }
    .player-card { display: grid; align-items: center; gap: 0.6rem; padding: 0.55rem 0.65rem; border: 1px solid var(--background-modifier-border); border-radius: var(--radius-m); }
    .named-player { grid-template-columns: auto minmax(0, 1fr) auto; }
    .generic-player { grid-template-columns: auto minmax(0, 1fr) minmax(0, 1fr) auto; }
    .player-name { overflow-wrap: anywhere; }
    .level-badge, .number-field > span { color: var(--text-muted); font-size: var(--font-ui-smaller); }
    .number-field { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem; }
    input[type="number"] { width: 3.1rem; max-width: 100%; text-align: center; padding: 0.25rem; }
    input[type="checkbox"] { margin: 0; }
    .excluded { opacity: 0.55; }
    .excluded .player-name { text-decoration: line-through; }
    .remove-player { margin: 0; padding: 0.2rem; height: auto; background: transparent; box-shadow: none; border: 0; color: var(--text-muted); }
    .add-players { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; align-self: flex-start; font-size: var(--font-ui-small); }
    .add-players span { display: flex; }
    .empty-party { margin: 0; color: var(--text-muted); font-size: var(--font-ui-small); }
</style>
