<script lang="ts">
    import {
        type MenuItem,
        setIcon,
        Notice,
        Platform,
        Menu
    } from "obsidian";
    import {
        BACKWARD,
        DICE,
        EXPAND,
        FORWARD,
        GROUP,
        NEW,
        PLAY,
        REDO,
        RollPlayerInitiativeBehavior,
        STOP
    } from "src/utils";
    import { createEventDispatcher, getContext } from "svelte";
    import type InitiativeTracker from "src/main";
    import { tracker } from "../stores/tracker";
    import { tooltip } from "src/ui/tooltip";

    const { state, data, logFile, sort, party, ordered } = tracker;

    const desktop = Platform.isDesktop;

    const icon = (node: HTMLElement, value: string) => setIcon(node, value);

    const plugin = getContext<InitiativeTracker>("plugin");

    const dispatch = createEventDispatcher();

    const open = (evt: MouseEvent) => {
        const menu = new Menu();
        menu.addItem((item) => {
            item.setIcon(NEW)
                .setTitle("New Encounter")
                .onClick(() => tracker.new(plugin));
        });
        menu.addItem((item) => {
            item.setIcon(REDO)
                .setTitle("Reset HP / Status")
                .onClick(() => tracker.reset());
        });
        menu.addItem((item) => {
            item.setIcon(DICE)
                .setTitle("Re-roll Initiatives")
                .onClick(() => tracker.roll(plugin));
        });
        menu.addItem((item) => {
            item.setIcon(GROUP)
                .setTitle(
                    plugin.data.condense
                        ? "Use individual initiative rolls"
                        : "Use shared creature initiative"
                )
                .onClick(async () => {
                    plugin.data.condense = !plugin.data.condense;
                    await plugin.saveSettings();
                    item.setIcon(plugin.data.condense ? EXPAND : GROUP);
                    item.setTitle(
                        plugin.data.condense
                            ? "Use individual initiative rolls"
                            : "Use shared creature initiative"
                    );
                });
        });
        menu.addItem((item) => {
            item.setTitle($sort ? "Sort Ascending" : "Sort Descending").onClick(
                async () => {
                    plugin.data.descending = !plugin.data.descending;
                    await plugin.saveSettings();
                    item.setTitle(
                        plugin.data.descending
                            ? "Sort Ascending"
                            : "Sort Descending"
                    );
                }
            );
        });
        menu.addSeparator();

        if ($data.parties && $data.parties.length) {
            if (Platform.isMobile) {
                menu.addItem((item) => {
                    /* const partyMenu =  */ item.setIcon("switch")
                        .setTitle("Switch Party")
                        .setIsLabel(true);
                });
                menu.addItem((item) => {
                    item.setTitle("None")
                        .onClick(() => {
                            tracker.setParty("", plugin);
                        })
                        .setChecked(!$party || $party == "");
                });
                for (const p of $data.parties) {
                    menu.addItem((item) => {
                        item.setTitle(p.name)
                            .onClick(() => {
                                tracker.setParty(p.name, plugin);
                            })
                            .setChecked($party == p.name);
                    });
                }
            } else {
                menu.addItem((item) => {
                    const partyMenu = item
                        .setIcon("switch")
                        .setTitle("Switch Party")
                        .setSubmenu();
                    partyMenu.addItem((item) => {
                        item.setTitle("None")
                            .onClick(() => {
                                tracker.setParty("", plugin);
                            })
                            .setChecked(!$party || $party == "");
                    });
                    for (const p of $data.parties) {
                        partyMenu.addItem((item) => {
                            item.setTitle(p.name)
                                .onClick(() => {
                                    tracker.setParty(p.name, plugin);
                                })
                                .setChecked($party == p.name);
                        });
                    }
                });
            }
        }
        if (Platform.isMobile) {
            menu.addItem((item) => {
                item.setIcon("dice")
                    .setTitle("Party Rolling Behavior")
                    .setIsLabel(true);
            });
            menu.addItem((item) => {
                item.setTitle("Always Roll")
                    .onClick(async () => {
                        plugin.data.rollPlayerInitiatives =
                            RollPlayerInitiativeBehavior.Always;
                        await plugin.saveSettings();
                    })
                    .setChecked(
                        plugin.data.rollPlayerInitiatives ==
                            RollPlayerInitiativeBehavior.Always
                    );
            });
            menu.addItem((item) => {
                item.setTitle("Never Roll")
                    .onClick(async () => {
                        plugin.data.rollPlayerInitiatives =
                            RollPlayerInitiativeBehavior.Never;
                        await plugin.saveSettings();
                    })
                    .setChecked(
                        plugin.data.rollPlayerInitiatives ==
                            RollPlayerInitiativeBehavior.Never
                    );
            });
            menu.addItem((item) => {
                item.setTitle("Set to Zero")
                    .onClick(async () => {
                        plugin.data.rollPlayerInitiatives =
                            RollPlayerInitiativeBehavior.SetToZero;
                        await plugin.saveSettings();
                    })
                    .setChecked(
                        plugin.data.rollPlayerInitiatives ==
                            RollPlayerInitiativeBehavior.SetToZero
                    );
            });
        } else {
            menu.addItem((item) => {
                const partyMenu = item
                    .setIcon("dice")
                    .setTitle("Party Rolling Behavior")
                    .setSubmenu();

                partyMenu.addItem((item) => {
                    item.setTitle("Always Roll")
                        .onClick(async () => {
                            plugin.data.rollPlayerInitiatives =
                                RollPlayerInitiativeBehavior.Always;
                            await plugin.saveSettings();
                        })
                        .setChecked(
                            plugin.data.rollPlayerInitiatives ==
                                RollPlayerInitiativeBehavior.Always
                        );
                });
                partyMenu.addItem((item) => {
                    item.setTitle("Never Roll")
                        .onClick(async () => {
                            plugin.data.rollPlayerInitiatives =
                                RollPlayerInitiativeBehavior.Never;
                            await plugin.saveSettings();
                        })
                        .setChecked(
                            plugin.data.rollPlayerInitiatives ==
                                RollPlayerInitiativeBehavior.Never
                        );
                });
                partyMenu.addItem((item) => {
                    item.setTitle("Set to Zero")
                        .onClick(async () => {
                            plugin.data.rollPlayerInitiatives =
                                RollPlayerInitiativeBehavior.SetToZero;
                            await plugin.saveSettings();
                        })
                        .setChecked(
                            plugin.data.rollPlayerInitiatives ==
                                RollPlayerInitiativeBehavior.SetToZero
                        );
                });
            });
        }

        menu.addSeparator();
        menu.addItem((item) => {
            item.setIcon("copy").setTitle("Copy initiative order").onClick(async () => {
                try {
                    await navigator.clipboard.writeText($ordered.map((creature) => `${creature.initiative} ${creature.name}`).join("\n"));
                    new Notice("Initiative order copied to clipboard.");
                } catch {
                    new Notice("Could not copy the initiative order.");
                }
                });
        });

        menu.showAtMouseEvent(evt);
    };

    const openLogFile = async () => {
        if ($logFile) {
            const leaf = plugin.app.workspace.getLeaf();
            leaf.openFile($logFile);
        }
    };
</script>

<div class="buttons">
    <div class="state">
        {#if $state}
            <button type="button" use:icon={STOP} use:tooltip={{text:"Stop combat",label:"Stop combat"}} on:click={() => tracker.setState(false)} />
            <button type="button" use:icon={BACKWARD} use:tooltip={{text:"Previous turn",label:"Previous turn"}} on:click={() => tracker.goToPrevious()} />
            <button type="button" class="mod-cta" on:click={() => tracker.goToNext()}><span use:icon={FORWARD} aria-hidden="true" /> Next turn</button>
        {:else}
            <button type="button" class="mod-cta" disabled={!$ordered.length} on:click={() => tracker.setState(true)}><span use:icon={PLAY} aria-hidden="true" /> Start combat</button>
        {/if}
    </div>
    <div class="clean">
        <button type="button" on:click={() => dispatch('add-creatures')}>Add</button>
        <button type="button" on:click={() => dispatch('save')}>Save</button>
        <button type="button" on:click={() => dispatch('load')}>Load</button>
        {#if $logFile}
            <button type="button" use:icon={"file-signature"} use:tooltip={{text:"Open log file",label:"Open log file"}} on:click={openLogFile} />
        {/if}
        {#if desktop}
            <button type="button" use:icon={"view"} use:tooltip={{text:"Open player view",label:"Open player view"}} on:click={() => dispatch("player-view")} />
        {/if}
        <button type="button" use:icon={"ellipsis-vertical"} use:tooltip={{text:"More tracker actions",label:"More tracker actions"}} on:click={open} />
    </div>
</div>

<style>
    .buttons {
        display: flex;
        flex-wrap:wrap;
        gap:0.4rem;
        justify-content: space-between;
        padding: 0 0 0.5rem 0;
    }
    .state {
        display: flex;
        justify-content: flex-start;
        align-items: center;
    }
    .clean {
        display: flex;
        justify-content: flex-end;
        align-items: center;
    }

    .state, .clean { flex-wrap:wrap; gap:0.3rem; }
    .mod-cta { display:inline-flex; align-items:center; gap:0.35rem; }
    .mod-cta span { display:flex; }
</style>
