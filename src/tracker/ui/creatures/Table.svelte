<script lang="ts">
    import { ExtraButtonComponent, setIcon } from "obsidian";

    import CreatureTemplate from "./Creature.svelte";

    import { AC, DICE, HP, META_MODIFIER } from "src/utils";
    import { Creature, getId } from "src/utils/creature";
    import { createEventDispatcher } from "svelte";
    import { dndzone } from "svelte-dnd-action";
    import { flip } from "svelte/animate";
    import { showCreatureMenu } from "./creature-menu";

    import { tracker } from "../../stores/tracker";
    import type InitiativeTracker from "src/main";
    import { getContext } from "svelte";

    const plugin = getContext<InitiativeTracker>("plugin");
    const { state, ordered, dragEnabled, data } = tracker;

    $: items = [...$ordered].map((c) => {
        return { creature: c, id: getId() };
    });
    $: showBaseColorColumn = $data?.showBaseColorColumn ?? true;

    const dispatch = createEventDispatcher();

    const hpIcon = (node: HTMLElement) => {
        setIcon(node, HP);
    };
    const acIcon = (node: HTMLElement) => {
        setIcon(node, AC);
    };
    const baseColorIcon = (node: HTMLElement) => {
        setIcon(node, "palette");
    };
    const flipDurationMs = 300;
    function handleDndConsider(
        e: CustomEvent<GenericDndEvent<{ creature: Creature; id: string }[]>>
    ) {
        items = e.detail.items;
    }
    function handleDndFinalize(
        e: CustomEvent<GenericDndEvent<{ creature: Creature; id: string }[]>>
    ) {
        if (e.detail.items.length > 1) {
            let dropped = e.detail.items.find(
                ({ id }) => id == e.detail.info.id
            );
            const index = e.detail.items.findIndex(
                (c) => c.id == e.detail.info.id
            );
            if (index == e.detail.items.length - 1) {
                dropped.creature.initiative =
                    e.detail.items[index - 1].creature.initiative;
            } else {
                dropped.creature.initiative =
                    e.detail.items[index + 1].creature.initiative;
            }
            tracker.logNewInitiative(dropped.creature);
        }
        items = e.detail.items;
        $tracker = [...items.map(({ creature }, i) => {
            creature.manualOrder = i;
            return creature;
        })];
    }

    const diceIcon = (node: HTMLElement) => {
        new ExtraButtonComponent(node).setIcon(DICE);
    };
    const dragLockIcon = (node: HTMLElement, locked: boolean) => {
        const button = new ExtraButtonComponent(node);
        const update = (isLocked: boolean) => {
            button
                .setIcon(isLocked ? "lock" : "unlock")
                .setTooltip(
                    isLocked
                        ? "Unlock creature order"
                        : "Lock creature order"
                );
        };
        update(locked);
        return { update };
    };
    const toggleDragLock = async () => {
        $dragEnabled = !$dragEnabled;
        plugin.data.dragEnabled = $dragEnabled;
        await plugin.saveSettings();
    };
</script>

<table class="initiative-tracker-table">
    <colgroup>
        {#if showBaseColorColumn}
            <col class="base-colour-column" />
        {/if}
        <col class="initiative-column" />
        <col class="name-column" />
        <col class="hp-column" />
        <col class="ac-column" />
    </colgroup>
    {#if $ordered.length}
        <thead class="tracker-table-header">
            <tr>
                {#if showBaseColorColumn}
                    <th class="icon-header">
                        <div
                            class="table-header-button"
                            use:baseColorIcon
                            title="Mini base colour"
                            aria-label="Mini base colour"
                        />
                    </th>
                {/if}
                <th class="icon-header">
                    <div
                        class="table-header-button"
                        use:diceIcon
                        aria-label="Re-Roll Initiatives"
                        on:click={() => tracker.roll(plugin)}
                    />
                </th>
                <th class="left">
                    <div class="name-header">
                        <span>Name</span>
                        <div
                            class="table-header-button inline-drag-lock"
                            use:dragLockIcon={!$dragEnabled}
                            on:click|stopPropagation={toggleDragLock}
                        />
                    </div>
                </th>
                <th use:hpIcon class="center" />
                <th use:acIcon class="center" />
            </tr>
        </thead>
        <tbody
            use:dndzone={{
                items,
                flipDurationMs,
                dropTargetStyle: {},
                morphDisabled: true,
                dragDisabled: !$dragEnabled
            }}
            on:consider={handleDndConsider}
            on:finalize={handleDndFinalize}
        >
            {#each items as { creature, id } (id)}
                <tr
                    class="draggable initiative-tracker-creature"
                    class:disabled={!creature.enabled}
                    class:active={$state && creature.active}
                    class:viewing={creature.viewing}
                    class:friendly={creature.friendly}
                    animate:flip={{ duration: flipDurationMs }}
                    data-hp={creature.hp}
                    data-hp-max={creature.current_max}
                    data-hp-percent={Math.round(
                        ((creature.hp ?? 0) / creature.max) * 100
                    )}
                    on:click={(e) => {
                        dispatch("open-combatant", { creature, newLeaf: e.ctrlKey || e.metaKey });
                        e.stopPropagation();
                    }}
                    on:contextmenu|preventDefault|stopPropagation={(evt) => {
                        showCreatureMenu(
                            creature,
                            () => dispatch("edit", creature),
                            evt
                        );
                    }}
                >
                    <CreatureTemplate
                        {creature}
                        {showBaseColorColumn}
                        on:open-combatant
                    />
                </tr>
            {/each}
        </tbody>
    {:else}
        <div class="no-creatures">
            <p>Add a creature to get started!</p>
            <small>Players may be created in settings.</small>
        </div>
    {/if}
</table>

<style scoped>
    .no-creatures {
        margin: 1rem;
        text-align: center;
    }
    .initiative-tracker-table {
        padding: 0.5rem;
        align-items: center;
        gap: 0.25rem 0.5rem;
        width: 100%;
        min-width: 100%;
        margin-left: 0rem;
        table-layout: fixed;
        border-collapse: separate;
        border-spacing: 0 2px;
    }
    .base-colour-column {
        width: 2rem;
    }
    .initiative-column {
        width: 2.5rem;
    }
    .name-column {
        width: auto;
    }
    .hp-column {
        width: 4.75rem;
    }
    .ac-column {
        width: 2.75rem;
    }

    .left {
        text-align: left;
    }
    .center {
        text-align: center;
    }
    .icon-header {
        padding-right: 0;
        padding-left: 0;
        text-align: center;
    }
    .table-header-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        margin: 0;
    }
    .table-header-button :global(.clickable-icon) {
        margin: 0;
    }
    .name-header {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        min-height: var(--icon-size);
    }
    .inline-drag-lock {
        width: auto;
    }

    .tracker-table-header {
        font-weight: bolder;
    }

    .initiative-tracker-creature {
        position: relative;
    }
    .initiative-tracker-creature.active {
        background-color: rgba(0, 0, 0, 0.1);
    }
    :global(.theme-dark) .initiative-tracker-creature.active {
        background-color: rgba(255, 255, 255, 0.1);
    }
    .initiative-tracker-creature.disabled :global(*) {
        color: var(--text-faint);
    }
    .initiative-tracker-creature :global(td) {
        border-top: 1px solid transparent;
        border-bottom: 1px solid transparent;
    }
    .initiative-tracker-creature :global(td:first-child) {
        border-left: 1px solid transparent;
    }
    .initiative-tracker-creature :global(td:last-child) {
        border-right: 1px solid transparent;
    }
    .initiative-tracker-creature:hover :global(td),
    .initiative-tracker-creature.viewing :global(td) {
        border-top: 1px solid var(--background-modifier-border);
        border-bottom: 1px solid var(--background-modifier-border);
    }
    .initiative-tracker-creature:hover :global(td:first-child),
    .initiative-tracker-creature.viewing :global(td:first-child) {
        border-left: 1px solid var(--background-modifier-border);
    }
    .initiative-tracker-creature:hover :global(td:last-child),
    .initiative-tracker-creature.viewing :global(td:last-child) {
        border-right: 1px solid var(--background-modifier-border);
    }
</style>
