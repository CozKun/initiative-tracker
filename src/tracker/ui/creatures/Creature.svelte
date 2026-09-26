<script lang="ts">
    import { DEFAULT_UNDEFINED, FRIENDLY, HIDDEN, INITIATIVE_TRACKER_VIEW } from "src/utils";
    import type { Creature } from "src/utils/creature";
    import BaseColorPicker from "./BaseColorPicker.svelte";
    import Initiative from "./Initiative.svelte";
    import Status from "./Status.svelte";
    import { Platform, setIcon } from "obsidian";
    import { tracker } from "../../stores/tracker";
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();
    const { quickHealth } = tracker;

    export let creature: Creature;
    export let showBaseColorColumn = true;
    $: statuses = creature.status;

    const name = () => creature.getName();
    const statblockLink = () => creature.getStatblockLink();
    const hiddenIcon = (div: HTMLElement) => {
        setIcon(div, HIDDEN);
    };
    const friendlyIcon = (div: HTMLElement) => {
        setIcon(div, FRIENDLY);
    };

    const hoverParent: { hoverPopover: null } = { hoverPopover: null };
    let hoverTimeout: NodeJS.Timeout = null;
    const tryHover = (evt: MouseEvent) => {
        hoverTimeout = setTimeout(() => {
            if (creature["statblock-link"]) {
                let link = statblockLink();
                if (/\[.+\]\(.+\)/.test(link)) {
                    //md
                    [, link] = link.match(/\[.+?\]\((.+?)\)/);
                } else if (/\[\[.+\]\]/.test(link)) {
                    //wiki
                    [, link] = link.match(/\[\[(.+?)(?:\|.+?)?\]\]/);
                }

                app.workspace.trigger("hover-link", {
                    event: evt,
                    source: INITIATIVE_TRACKER_VIEW,
                    hoverParent,
                    targetEl: evt.target as HTMLElement,
                    linktext: link
                });
            }
        }, 1000);
    };

    const cancelHover = (evt: MouseEvent) => {
        clearTimeout(hoverTimeout);
    };
</script>

{#if showBaseColorColumn}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <td class="base-colour-container" on:click|stopPropagation>
        <BaseColorPicker {creature} />
    </td>
{/if}
<!-- svelte-ignore a11y-click-events-have-key-events -->
<td
    class="initiative-container"
    class:first-column={!showBaseColorColumn}
    on:click={(e) => e.stopPropagation()}
>
    <Initiative
        initiative={creature.initiative}
        modifier={[creature.modifier].flat().reduce((a, b) => a + b, 0)}
        on:click={(e) => e.stopPropagation()}
        on:initiative={(e) => {
            tracker.updateCreatures({
                creature,
                change: { initiative: Number(e.detail) }
            });
        }}
    />
</td>
<td class="name-container">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
        class="name-holder"
        on:click|stopPropagation={(evt) => {
            dispatch("open-combatant", { creature, newLeaf: evt.ctrlKey || evt.metaKey });
        }}
        on:mouseenter={tryHover}
        on:mouseleave={cancelHover}
    >
        {#if creature.hidden}
            <div class="centered-icon" use:hiddenIcon />
        {/if}
        {#if creature.friendly}
            <div class="centered-icon" use:friendlyIcon />
        {/if}
        {#if creature.player}
            <strong class="name player">{creature.name}</strong>
        {:else}
            <span class="name" class:ally={creature.friendly}>{name()}</span>
        {/if}
    </div>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="statuses" on:click={(e) => e.stopPropagation()}>
        {#if statuses.size}
            {#each [...statuses] as status}
                <Status
                    {status}
                    on:remove={() => {
                        tracker.updateCreatures({
                            creature,
                            change: { remove_status: [status] }
                        });
                    }}
                />
            {/each}
        {/if}
    </div>
</td>

<td
    class="center hp-container creature-adder"
    class:mobile={Platform.isMobile}
    class:health-selected={$quickHealth?.creature === creature}
    role="button"
    tabindex="0"
    aria-label={`Adjust health: ${name()}`}
    aria-haspopup="dialog"
    aria-expanded={$quickHealth?.creature === creature}
    on:keydown|stopPropagation={(evt) => {
        if (evt.key === "Enter" || evt.key === " ") {
            evt.preventDefault();
            tracker.openQuickHealth(creature, evt.currentTarget);
        }
    }}
    on:click|stopPropagation={(evt) => {
        tracker.openQuickHealth(creature, evt.currentTarget);
    }}
>
    <div>
        {@html creature.hpDisplay}
    </div>
</td>

<td
    class="center ac-container creature-adder"
    class:mobile={Platform.isMobile}
    on:click|stopPropagation={(evt) => {
        tracker.openEffect(creature, false, "ac");
    }}
>
    <div
        class:dirty-ac={creature.current_ac != creature.ac}
        aria-label={creature.current_ac != creature.ac ? `${creature.ac}` : ""}
    >
        {creature.current_ac ? creature.current_ac : DEFAULT_UNDEFINED}
    </div>
</td>

<style scoped>
    .ally { font-weight: 700; }
    .health-selected { outline: 2px solid var(--interactive-accent); outline-offset: -2px; border-radius: var(--radius-s); }
    .name-holder {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: small;
    }
    .centered-icon {
        display: flex;
        align-items: center;
    }
    .name {
        display: block;
        text-align: left;
        background-color: inherit;
        border: 0;
        padding: 0;
        height: unset;
        word-break: keep-all;
    }
    .center {
        text-align: center;
    }
    .creature-adder {
        cursor: pointer;
    }
    .base-colour-container {
        text-align: center;
        border-top-left-radius: 0.25rem;
        border-bottom-left-radius: 0.25rem;
    }
    .initiative-container.first-column {
        border-top-left-radius: 0.25rem;
        border-bottom-left-radius: 0.25rem;
    }
    .statuses {
        display: flex;
        flex-flow: row wrap;
        column-gap: 0.25rem;
    }

    .ac-container {
        border-top-right-radius: 0.25rem;
        border-bottom-right-radius: 0.25rem;
    }
    .dirty-ac {
        font-weight: var(--font-bold);
    }
    .mobile {
        font-size: smaller;
    }
</style>
