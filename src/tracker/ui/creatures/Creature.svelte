<script lang="ts">
    import { showCreatureMenu } from "./creature-menu";
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

    $: name = creature.getName();
    const statblockLink = () => creature.getStatblockLink();
    const hiddenIcon = (div: HTMLElement) => {
        setIcon(div, HIDDEN);
    };
    const friendlyIcon = (div: HTMLElement) => {
        setIcon(div, FRIENDLY);
    };
    const actionsIcon = (button: HTMLElement) => setIcon(button, "ellipsis");
    const edit = () => dispatch("edit", creature);
    function keyboardMenu(event: KeyboardEvent) {
        if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return;
        event.preventDefault();
        event.stopPropagation();
        const button = event.currentTarget as HTMLButtonElement;
        const { left, bottom } = button.getBoundingClientRect();
        showCreatureMenu(creature, edit, { x: left, y: bottom }, button.ownerDocument);
    }

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
    <div class="identity-line">
        <button type="button" class="name-holder" aria-label={`Open statblock: ${name}`}
            on:click|stopPropagation={(evt) => dispatch("open-combatant", { creature, newLeaf: evt.ctrlKey || evt.metaKey })}
            on:mouseenter={tryHover} on:mouseleave={cancelHover} on:keydown={keyboardMenu}>
            {#if creature.hidden}<span class="centered-icon" use:hiddenIcon aria-hidden="true" />{/if}
            {#if creature.friendly}<span class="centered-icon" use:friendlyIcon aria-hidden="true" />{/if}
            <span class="name" class:player={creature.player} class:ally={creature.friendly}>{name}</span>
        </button>
        <button type="button" class="creature-actions" class:mobile-actions={Platform.isMobile} aria-label={`Actions for ${name}`} use:actionsIcon
            on:click|stopPropagation={(evt) => showCreatureMenu(creature, edit, evt, evt.view?.document)} />
    </div>
    {#if statuses.size}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div class="statuses" on:click|stopPropagation>
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
        </div>
    {/if}
</td>

<td
    class="center hp-container creature-adder"
    class:mobile={Platform.isMobile}
    class:health-selected={$quickHealth?.creature === creature}
    role="button"
    tabindex="0"
    aria-label={`Adjust health: ${name}`}
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
    .name-container { padding-inline:0.3rem 0.15rem; vertical-align:middle; }
    .identity-line { display:flex; align-items:center; gap:0.2rem; }
    .identity-line button { background:transparent; box-shadow:none; border:0; margin:0; }
    .creature-actions { display:none; flex:none; place-items:center; padding:0; width:44px; height:44px; color:var(--text-muted); }
    .creature-actions.mobile-actions { display:grid; }
    .name.player, .name.ally { font-weight:700; }
    .health-selected { outline: 2px solid var(--interactive-accent); outline-offset: -2px; border-radius: var(--radius-s); }
    button.name-holder {
        display: flex;
        flex:1;
        align-items: center;
        gap: 0.25rem;
        min-width:0;
        min-height:1.65rem;
        padding:0.2rem 0;
        height:auto;
        white-space:normal;
        line-height:1.3;
        font-size:var(--font-ui-small, 0.875rem);
        color:inherit;
        text-align:left;
    }
    .centered-icon {
        display: flex;
        align-items: center;
        flex-shrink:0;
    }
    .name {
        min-width:0;
        overflow-wrap:anywhere;
        word-break:normal;
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
        gap:0.2rem 0.25rem;
    }

    .ac-container {
        border-top-right-radius: 0.25rem;
        border-bottom-right-radius: 0.25rem;
    }
    .dirty-ac {
        font-weight: var(--font-bold);
    }
    .mobile {
        font-size: var(--font-ui-small);
    }
    @media (pointer:coarse) {
        button.name-holder { min-height:44px; font-size:max(0.875rem, var(--font-ui-small, 0.875rem)); }
        button.creature-actions { display:grid; }
    }
</style>
