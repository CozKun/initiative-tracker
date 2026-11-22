<script lang="ts">
    import { tooltip } from "src/ui/tooltip";
    import Creature from "./Creature.svelte";
    import { getContext } from "svelte";
    import Filters from "../filters/Filters.svelte";
    import { Menu, Notice, setIcon } from "obsidian";
    import Pagination from "./Pagination.svelte";
    import type { BuiltFilterStore } from "../../stores/filter/filter";

    import type { BuiltTableStore } from "../../stores/table/table";
    import { HeadersModal } from "src/builder/stores/table/headers-modal";
    import { FiltersModal } from "src/builder/stores/filter/filters-modal";
    import type InitiativeTracker from "src/main";
    import Ajv from "ajv";
    import schema from "../../stores/filter/filter-schema.json";
    import type { BuilderState } from "src/builder/builder.types";

    const table = getContext<BuiltTableStore>("table");
    const { sortDir, allHeaders } = table;
    const filterStore = getContext<BuiltFilterStore>("filters");
    const { filtered, layout } = filterStore;
    const plugin = getContext<InitiativeTracker>("plugin");

    let slice = 50;

    const sortUp = (node: HTMLElement) => {
        setIcon(node, "chevron-up");
    };
    const sortDown = (node: HTMLElement) => {
        setIcon(node, "chevron-down");
    };

    const settingsMenu = (evt: CustomEvent<MouseEvent>) => {
        const menu = new Menu();
        menu.addItem((item) => {
            item.setTitle("Edit Headers").onClick(() => {
                openHeadersModal();
            });
        })
            .addItem((item) => {
                item.setTitle("Edit Filters").onClick(() => {
                    openFiltersModal();
                });
            })
            .addSeparator()
            .addItem((item) => {
                item.setTitle("Export").onClick(() => {
                    const link = createEl("a");
                    const file = new Blob(
                        [JSON.stringify(plugin.data.builder)],
                        {
                            type: "json"
                        }
                    );
                    const url = URL.createObjectURL(file);
                    link.href = url;
                    link.download = `initiative-tracker-encounter-builder.json`;
                    link.click();
                });
            })
            .addItem((item) => {
                item.setTitle("Import").onClick(() => {
                    //validate;
                    const ajv = new Ajv();

                    // validate is a type guard for MyData - type is inferred from schema type
                    const validate = ajv.compile<BuilderState>(schema);
                    const input = createEl("input", {
                        attr: {
                            type: "file",
                            name: "builder_state",
                            accept: ".json"
                        }
                    });
                    input.onchange = async () => {
                        const { files } = input;
                        if (!files.length) return;

                        const reader = new FileReader();
                        reader.onload = async (
                            event: ProgressEvent<FileReader>
                        ) => {
                            if (typeof event.target.result == "string") {
                                let json: any;
                                try {
                                    json = JSON.parse(event.target.result);
                                } catch (e) {
                                    new Notice(
                                        "There was an issue parsing the file as JSON."
                                    );
                                }
                                if (validate(json)) {
                                    plugin.data.builder = { ...json };
                                    await plugin.saveSettings();
                                    filterStore.resetLayout();
                                } else {
                                    console.log(
                                        ...validate.errors.map((e) => e.message)
                                    );
                                    new Notice(
                                        "This file does not match the builder state schema."
                                    );
                                }
                            }
                        };
                        reader.readAsText(files[0]);
                    };
                    input.click();
                });
            });
        menu.showAtMouseEvent(evt.detail);
    };
    const openFiltersModal = () => {
        const modal = new FiltersModal($layout, filterStore);
        modal.open();
        modal.onClose = () => {
            if (modal.canceled) return;
            $layout = modal.layout;
        };
    };
    const openHeadersModal = () => {
        const modal = new HeadersModal($table.map((t) => t.toState()));
        modal.open();
        modal.onClose = () => {
            if (modal.canceled) return;
            if (modal.reset) {
                table.resetToDefault();
                return;
            }
            table.setHeadersFromState(modal.headers);
        };
    };

    let page = 1;
    $: pages = Math.ceil($filtered.length / slice);
    $: page = Math.max(1, Math.min(page, pages));
</script>

<h3 class="builder-section-heading">Bestiary</h3>
<div class="filters">
    <Filters on:settings={(evt) => settingsMenu(evt)} />
</div>

{#if !$filtered.length}
    <p class="no-creatures">{plugin.bestiary.length ? 'No creatures match your filters.' : 'No bestiary creatures available.'}</p>
{:else if $allHeaders.length}
    <div class="bestiary-scroll" role="region" aria-label="Bestiary results" tabindex="0">
    <table>
        <thead>
            {#each $allHeaders as header (header.text)}
                <th aria-sort={header.active ? ($sortDir ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" class="table-header"
                        use:tooltip={header.field === "xp" ? "XP per creature. Click to sort by XP." : `Sort by ${header.text}`}
                        on:click={() => table.sort(header)}>
                        <span class="table-header-content">{header.text}</span>
                        {#if header.active}
                            {#if $sortDir}
                                <div class="has-icon" use:sortUp />
                            {:else}
                                <div class="has-icon" use:sortDown />
                            {/if}
                        {/if}
                    </button>
                </th>
            {/each}
        </thead>
        <tbody>
            {#each $filtered.slice((page - 1) * slice, page * slice) as creature}
                <Creature {creature} />
            {/each}
        </tbody>
    </table>
    </div>
{/if}

{#if pages > 1}
<Pagination
    {slice}
    {page}
    {pages}
    on:slice={(evt) => { slice = evt.detail; page = 1; }}
    on:previous={() => (page = page - 1)}
    on:next={() => (page = Math.min(page + 1, pages))}
    on:page={(evt) => (page = evt.detail)}
/>
{/if}

<style scoped>
    .filters {
        margin:0.55rem 0;
    }
    .table-header {
        display: flex;
        gap:0.25rem; align-items:center; padding:0.3rem 0.45rem; box-shadow:none; background:transparent;
    }

    .has-icon {
        display: flex;
        align-items: center;
    }

    table {
        width: 100%;
    }
    .bestiary-scroll { overflow-x:auto; max-width:100%; }
    .no-creatures { color:var(--text-muted); }
</style>
