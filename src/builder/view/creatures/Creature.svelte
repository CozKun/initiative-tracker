<script lang="ts">
    import { tooltip, tooltipOptions } from "src/ui/tooltip";
    import type { SRDMonster } from "src/types/creatures";
    import { ExtraButtonComponent, setIcon } from "obsidian";
    import { getContext } from "svelte";
    import { encounter } from "../../stores/encounter";
    import Nullable from "../Nullable.svelte";
    import { convertFraction, DEFAULT_UNDEFINED } from "src/utils";
    import { Creature as CreatureCreator } from "src/utils/creature";
    import type { createTable } from "src/builder/stores/table/table";
    import type InitiativeTracker from "src/main";

    const { players } = encounter;
    const { average, levels } = players;

    const plugin = getContext<InitiativeTracker>("plugin");
    const table = getContext<ReturnType<typeof createTable>>("table");

    export let creature: SRDMonster;
    $: xp = table.xpFor(creature, $levels);
    const add = (node: HTMLElement) => {
        new ExtraButtonComponent(node).setIcon("plus-with-circle").setTooltip("Add a copy to the encounter", tooltipOptions);
    };
    function stringify(
        property: Record<string, any> | string | any[] | number | boolean,
        depth: number = 0,
        joiner: string = " ",
        parens = true
    ): string {
        const ret = [];
        if (depth == 5) {
            return "";
        }
        if (property == null) return ``;
        if (typeof property == "string") return property;
        if (typeof property == "number") return `${property}`;
        if (Array.isArray(property)) {
            ret.push(
                `${parens ? "(" : ""}${property
                    .map((p) => stringify(p, depth++))
                    .join(joiner)}${parens ? ")" : ""}`
            );
        } else if (typeof property == "object") {
            for (const value of Object.values(property)) {
                ret.push(stringify(value, depth++));
            }
        }
        return ret.join(" ");
    }

    function getSource(source: string | string[]): string {
        if (!Array.isArray(source)) return source;
        let sliced = source.slice(0, 2);
        if (source.length > 2) {
            sliced.push(`and ${source.length - 2} more`);
        }

        return stringify(sliced, 0, ", ", false);
    }
    function getTooltip(source: string | string[]): string {
        if (!Array.isArray(source)) return "";
        return stringify(source, 0, ", ", false);
    }

    $: insignificant =
        "cr" in creature &&
        creature.cr &&
        convertFraction(creature.cr) < $average - 3;
    $: challenge =
        "cr" in creature &&
        creature.cr &&
        convertFraction(creature.cr) > $average + 3;

    const baby = (node: HTMLElement) => setIcon(node, "baby");
    const skull = (node: HTMLElement) => setIcon(node, "skull");
</script>

<tr class="creature">
    <td>
        <div class="creature-name-container">
            <div use:add on:click={() => encounter.add(creature)} />
            <!-- svelte-ignore a11y-mouse-events-have-key-events -->
            <div
                use:tooltip={"Open creature details. Ctrl/Cmd-click opens a new pane."}
                class="setting-item-name creature-name"
                on:click={(evt) =>
                    plugin.openCombatant(CreatureCreator.from(creature), evt.ctrlKey || evt.metaKey)}
            >
                {creature.name}
                {#if insignificant}
                    <div
                        class="contains-icon"
                        use:baby
                        use:tooltip={"This creature is significantly under the average party level and might not contribute much to the fight."}
                    />
                {/if}
                {#if challenge}
                    <div
                        class="contains-icon"
                        use:skull
                        use:tooltip={"This creature is significantly over the average party level and might prove a challenge."}
                    />
                {/if}
            </div>
            <div class="setting-item-description">
                {#if creature.source?.length}
                    <span use:tooltip={getTooltip(creature.source)}>
                        {getSource(creature.source)}
                    </span>
                {/if}
            </div>
            <!-- <div class="creature-name">
            </div> -->
            <!-- svelte-ignore a11y-mouse-events-have-key-events -->
        </div>
    </td>
    {#each $table as header}
        {#if header.field === "xp"}
            <td class="creature-xp" use:tooltip={"XP per creature. Uses the selected RPG system's XP calculation; a dash means no XP value is available."}>
                <Nullable str={xp === null ? DEFAULT_UNDEFINED : xp.toLocaleString()} />
            </td>
        {:else}
            <td><Nullable str={creature[header.field] ?? DEFAULT_UNDEFINED} /></td>
        {/if}
    {/each}
</tr>

<style scoped>
    .creature-xp { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .creature-name-container {
        /* display: flex;
        align-items: center;
        gap: 0.5rem; */
        display: grid;
        grid-template-areas:
            "add name"
            ". desc";
        justify-content: flex-start;
        align-items: center;
        grid-template-columns: auto 1fr;
    }
    .creature-name {
        cursor: pointer;
        display: flex;
        justify-content: space-between;
    }
    .setting-item-description {
        grid-area: desc;
    }
    /* .creature-name > div {
        display: flex;
        align-items: center;
    } */
</style>
