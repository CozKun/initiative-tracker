<script lang="ts">
    import { tooltipOptions } from "src/ui/tooltip";
    import {
        ExtraButtonComponent,
        Menu,
        Modal,
        Notice,
        Setting,
        stringifyYaml
    } from "obsidian";

    import Creature from "./Creature.svelte";
    import { Creature as CreatureCreator } from "../../../utils/creature";

    import { encounter } from "../../stores/encounter";
    import { expandEncounter, encounterBlockCreatures, groupEncounterCreatures } from "../../encounter-creatures";
    import { expandPlayers } from "../../stores/players";
    import { START_ENCOUNTER } from "src/utils";
    import { getContext } from "svelte";
    import { tracker } from "src/tracker/stores/tracker";

    import { writable } from "svelte/store";

    const { players } = encounter;

    const plugin = getContext("plugin");
    let name = writable("Encounter");
    let tempName = writable("");
    let updatingName = writable(false);

    const setName = () => {
        $updatingName = false;
        $name = $tempName.length ? $tempName : $name;
        $tempName = "";
    };
    const cancelName = () => {
        $updatingName = false;
        $tempName = "";
    };

    let rollHP = plugin.data.rollHP;
    const currentPlayers = () => expandPlayers($players, (name) => plugin.getPlayerByName(name));

    $: items = [...$encounter.entries()];

    let startIcon: ExtraButtonComponent;
    const start = (node: HTMLElement) => {
        startIcon = new ExtraButtonComponent(node)
            .setIcon(START_ENCOUNTER)
            .onClick(async () => {
                if (!plugin.view) {
                    await plugin.addTrackerView();
                }

                const view = plugin.view;
                const transformedCreatures = [...currentPlayers(), ...expandEncounter(items)].map((creature) => creature.toJSON());
                tracker.new(plugin, {
                    creatures: transformedCreatures,
                    name: $name,
                    round: 1,
                    state: false,
                    logFile: null,
                    newLog: true,
                    roll: true,
                    rollHP
                });
                plugin.app.workspace.revealLeaf(view.leaf);
            });
    };

    $: {
        if (startIcon) {
            if (!items.length) {
                startIcon.setDisabled(true);
                startIcon.setTooltip("", tooltipOptions);
            } else {
                startIcon.setDisabled(false);
                startIcon.setTooltip("Start this encounter in the initiative tracker", tooltipOptions);
            }
        }
    }
    const editIcon = (node: HTMLElement) => {
        new ExtraButtonComponent(node).setIcon("pencil").setTooltip("Rename this encounter", tooltipOptions);
    };
    const nameSaveIcon = (node: HTMLElement) => { new ExtraButtonComponent(node).setIcon("check").setTooltip("Apply encounter name", tooltipOptions); };
    let saveButton: ExtraButtonComponent;
    const saveIcon = (node: HTMLElement) => {
        saveButton = new ExtraButtonComponent(node).setIcon("save").setTooltip("Save this encounter and its Mini Colour Indicators", tooltipOptions);
    };
    $: saveButton?.setDisabled($encounter.size == 0);
    const save = () => {
        const modal = new Modal(app);
        modal.titleEl.setText("Save Encounter");
        let encName: string =
            $name != "Encounter"
                ? $name
                : `Encounter ${Object.keys(plugin.data.encounters).length}`;
        new Setting(modal.contentEl).setName("Encounter Name").addText((t) => {
            t.setPlaceholder(encName).onChange((v) => (encName = v));
        });

        const saveEncounter = () => {
            try {
                const creatures = [...currentPlayers(), ...expandEncounter($encounter)];
                plugin.addEncounter(encName, {
                    creatures: [...creatures.map((c) => c.toJSON())],
                    state: false,
                    name: encName,
                    round: 1,
                    roll: true,
                    rollHP: plugin.data.rollHP,
                    logFile: null,
                    timestamp: Date.now()
                });
                plugin.saveSettings();
                loadButton?.setDisabled(false);
                new Notice(`Encounter "${encName}" saved.`);
                modal.close();
            } catch (e) {
                new Notice("There was an issue saving the encounter.");
            }
        };
        new Setting(modal.contentEl).addButton((b) =>
            b.setButtonText("Save").onClick(() => {
                if (encName in plugin.data.encounters) {
                    const confirm = new Modal(app);
                    confirm.titleEl.setText("Are you sure?");
                    confirm.contentEl.createEl("p", {
                        text: "This will overwrite an existing encounter. Are you sure?"
                    });
                    new Setting(confirm.contentEl)
                        .addButton((b) =>
                            b.setButtonText("Overwrite").onClick(() => {
                                confirm.close();
                                saveEncounter();
                            })
                        )
                        .addExtraButton((b) =>
                            b.setIcon("cross").onClick(() => {
                                confirm.close();
                            })
                        );
                    confirm.open();
                } else {
                    saveEncounter();
                }
            })
        );
        modal.open();
    };

    const cancelIcon = (node: HTMLElement) => {
        new ExtraButtonComponent(node).setIcon("cross-in-box").setTooltip("Cancel renaming", tooltipOptions);
    };
    let exportIcon: ExtraButtonComponent;
    const exp = (node: HTMLElement) => {
        exportIcon = new ExtraButtonComponent(node).setIcon("copy");
    };
    $: {
        if (exportIcon) {
            if (!items.length) {
                exportIcon.setDisabled(true);
                exportIcon.setTooltip("", tooltipOptions);
            } else {
                exportIcon.setDisabled(false);
                exportIcon.setTooltip("Copy an encounter block, including Mini Colour Indicators, to paste into a note", tooltipOptions);
            }
        }
    }

    let loadButton: ExtraButtonComponent;
    const loadIcon = (node: HTMLElement) => {
        loadButton = new ExtraButtonComponent(node)
            .setIcon("upload")
            .setTooltip("Load a saved encounter, replacing the current builder contents", tooltipOptions);
    };
    $: loadButton?.setDisabled(Object.keys(plugin.data.encounters).length == 0);
    const load = (evt: MouseEvent) => {
        const menu = new Menu();
        for (const enc of Object.values(plugin.data.encounters)) {
            menu.addItem((item) => {
                item.setTitle(enc.name).onClick(() => {
                    $name = enc.name;
                    encounter.empty();
                    players.empty();
                    for (const creature of enc.creatures.filter((creature) => creature.player)) {
                        players.addFromState({ ...creature });
                    }
                    encounter.setMultiple(groupEncounterCreatures(enc.creatures.filter((creature) => !creature.player)
                        .map((creature) => CreatureCreator.fromJSON(creature, plugin))));
                });
            });
        }
        menu.showAtMouseEvent(evt);
    };
    const clear = (node: HTMLElement) => {
        new ExtraButtonComponent(node)
            .setIcon("eraser")
            .setTooltip("Clear the encounter creatures; keep the selected party", tooltipOptions);
    };
    const copy = async () => {
        const enc: {
            name?: string;
            players?: string[];
            creatures?: ReturnType<typeof encounterBlockCreatures>;
        } = {};
        if ($name?.length) {
            enc.name = $name;
        }
        if ($players?.length) {
            enc.players = $players.filter((p) => p.enabled && p.isPlayer).map((p) => p.name);
        }
        if ($encounter?.size) {
            enc.creatures = encounterBlockCreatures($encounter);
        }
        try {
            await navigator.clipboard.writeText(
                `\`\`\`encounter\n${stringifyYaml(enc)}\`\`\``
            );
            new Notice("Encounter saved to clipboard");
        } catch (e) {
            console.error(e);
            new Notice(
                "Could not save encounter, please check console for errors"
            );
        }
    };
</script>

<div class="encounter-header">
    <div class="encounter-name">
        {#if $updatingName}
            <input type="text" bind:value={$tempName} placeholder={$name} />
            <div use:nameSaveIcon on:click={setName} />
            <div use:cancelIcon on:click={cancelName} />
        {:else}
            <h3 class="built-encounter builder-section-heading">{$name}</h3>
            <div use:editIcon on:click={() => ($updatingName = true)} />
        {/if}
    </div>
    <div class="encounter-controls">
        <div use:start />
        <div use:saveIcon on:click={save} />
        <div use:loadIcon on:click={load} />
        <div use:exp on:click={copy} />
        <!-- <div use:load /> -->

        <div
            use:clear
            on:click={() => {
                encounter.empty();
                $name = "Encounter";
            }}
        />
    </div>
</div>
{#if !items.length}
    <span>Add some creatures to get started!</span>
{:else}
    <div class="encounter-creatures">
        {#each items as [creature, count] (creature)}
            <Creature {creature} {count} />
        {/each}
    </div>
{/if}

<style scoped>
    .encounter-name {
        display: flex;
        align-items: center;
    }
    .encounter-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 0.5rem;
        margin-bottom: 0.5rem;
        border-bottom: 1px solid var(--background-modifier-border);
    }
    .encounter-creatures {
        display: flex;
        gap: 0.5rem;
        flex-flow: column nowrap;
    }
    .encounter-header :global(.is-disabled) {
        cursor: not-allowed;
    }
    .encounter-controls {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }
</style>
