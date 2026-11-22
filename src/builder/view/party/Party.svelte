<script lang="ts">
    import { tooltip, accessibleName } from "src/ui/tooltip";
    import { setIcon } from "obsidian";
    import { getContext } from "svelte";
    import { get } from "svelte/store";
    import { players } from "../../stores/players";
    import { tracker } from "src/tracker/stores/tracker";
    import { Creature, playerIdentity } from "src/utils/creature";

    const { party, generics, levels, trackerCount } = players;
    const plugin = getContext("plugin");
    const { data } = tracker;
    $: parties = $data?.parties ?? plugin.data.parties;
    let open = plugin.data.builder.showParty ?? true;
    const playerEntry = (player: Creature) => ({
        ...player.toJSON(),
        isPlayer: true as const, enabled: true, count: 1
    });
    const partyMembers = (name: string) => plugin.getPlayersForParty(name).map(playerEntry);
    if (!get(players).length) {
        players.switchParty(partyMembers(plugin.data.defaultParty));
    }
    $: namedKeys = new Set($party.map(playerIdentity));
    $: selectedParty = parties.find((entry) => entry.players.length === namedKeys.size &&
        entry.players.every((name) => namedKeys.has(playerIdentity({ name }))))?.name ?? "";
    $: availablePlayers = getAvailable($data, namedKeys);
    function getAvailable(_settings: unknown, included: Set<string>) {
        return [...plugin.players.keys()].filter((name) => !included.has(playerIdentity({name}))).sort((a,b) => a.localeCompare(b));
    }
    function addPlayer(event: Event) {
        const select = event.currentTarget as HTMLSelectElement;
        if (select.value) players.add(playerEntry(plugin.getPlayerByName(select.value)));
        select.value = "";
    }
    const rememberOpen = (event: Event) => {
        const expanded = (event.currentTarget as HTMLDetailsElement).open;
        if (plugin.data.builder.showParty !== expanded) {
            plugin.data.builder.showParty = expanded;
            void plugin.saveSettings();
        }
    };
    const add = () => players.add({ isPlayer: false, level: 1, count: 1, enabled: true, includeInTracker: false });
    const icon = (node: HTMLElement, name: string) => setIcon(node, name);
</script>

<section class="builder-party" use:accessibleName={"Encounter party"}>
    <details class="party-panel" bind:open on:toggle={rememberOpen}>
        <summary>
            <h3 class="builder-section-heading">Party</h3>
            <span class="party-count">{$trackerCount} in tracker{#if $trackerCount !== $levels.length}{` · `}{$levels.length} for difficulty{/if}</span>
            <span class="chevron" class:expanded={open} use:icon={"chevron-right"} aria-hidden="true" />
        </summary>
        <div class="party-content">
            {#if parties.length}
                <label class="party-selector">
                    <span>Saved party</span>
                    <select value={selectedParty}
                        use:tooltip={{ text: "Choose named characters from a saved party. Any unnamed player groups stay in place.", label: "Select a party" }}
                        on:change={(event) => players.switchParty(event.currentTarget.value ? partyMembers(event.currentTarget.value) : [])}>
                        <option value="">{$party.length && !selectedParty ? 'Custom roster' : 'No saved party'}</option>
                        {#each parties as entry}<option value={entry.name}>{entry.name}</option>{/each}
                    </select>
                </label>
            {/if}
            <div class="players">
                {#each $party as player (playerIdentity(player))}
                    <div class="player-card named-player" class:excluded={!player.enabled}>
                        <label class="named-include">
                            <input type="checkbox" checked={player.enabled} aria-label={`Include ${player.name} in this encounter`}
                                on:change={() => players.toggleEnabled(player)} />
                            <span class="player-name">{player.name}</span>
                        </label>
                        <span class="level-badge">{player.level ? `Level ${player.level}` : 'Set level in settings'}</span>
                        <button type="button" class="remove-player clickable-icon" use:tooltip={{ text: "Remove from this encounter’s party", label: `Remove ${player.name} from party` }} use:icon={"x"} on:click={() => players.remove(player)} />
                    </div>
                {/each}
                {#each $generics as player, index}
                    <div class="player-card generic-player" class:excluded={!player.enabled}>
                        <input type="checkbox" checked={player.enabled}
                            use:tooltip={{ text: "Count this group towards difficulty and any temporary tracker places.", label: player.enabled ? "Exclude from encounter difficulty" : "Include in encounter difficulty" }}
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
                        <label class="placeholder-control">
                            <input type="checkbox" checked={player.includeInTracker !== false} on:change={(event) => players.setTrackerInclusion(player, event.currentTarget.checked)} />
                            Add temporary players to tracker
                        </label>
                    </div>
                {/each}
            </div>
            {#if !$players.length}<p class="empty-party">Choose who is playing, or add a planning group for the difficulty calculation.</p>{/if}
            {#if availablePlayers.length}
                <select class="add-saved" aria-label="Add a saved player" on:change={addPlayer}>
                    <option value="">Add a saved player…</option>
                    {#each availablePlayers as name}<option value={name}>{name}</option>{/each}
                </select>
            {/if}
            <button type="button" class="add-players"
                use:tooltip={{ text: "Add a group of players at the same level for encounter planning.", label: "Add planning group" }} on:click={add}>
                <span use:icon={"plus"} aria-hidden="true" /> Add planning group
            </button>
        </div>
    </details>
</section>

<style>
    .builder-party { min-width:0; padding:0.65rem; border:1px solid var(--background-modifier-border); border-radius:var(--radius-m); }
    summary { display:flex; align-items:center; gap:0.5rem; cursor:pointer; list-style:none; }
    details[open] summary { margin-bottom:0.65rem; }
    summary::-webkit-details-marker { display: none; }
    .party-count { margin-left: auto; color: var(--text-muted); font-size: var(--font-ui-smaller); }
    .chevron { display: flex; color: var(--text-muted); transition: transform 0.15s; }
    .chevron.expanded { transform: rotate(90deg); }
    .party-content, .players { display: flex; flex-direction: column; gap: 0.5rem; }
    .party-selector { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; font-size: var(--font-ui-smaller); color: var(--text-muted); }
    select { flex: 1; min-width: 0; max-width: 100%; }
    .player-card { display: grid; align-items: center; gap: 0.6rem; padding: 0.55rem 0.65rem; border: 1px solid var(--background-modifier-border); border-radius: var(--radius-m); }
    .named-player { grid-template-columns:minmax(0, 1fr) minmax(0,auto) auto; }
    .named-include { display:flex; align-items:center; gap:0.55rem; min-width:0; cursor:pointer; }
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
    .placeholder-control { grid-column:2 / -1; display:flex; align-items:center; gap:0.45rem; font-size:var(--font-ui-smaller); }
    .add-saved { width:100%; }
    @media (pointer:coarse) { .player-card label:has(input[type=checkbox]) { min-height:44px; } }
</style>
