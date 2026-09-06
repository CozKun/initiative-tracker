import { type Updater, derived, get, writable } from "svelte/store";
import {
    SortFunctions,
    type TableHeaderState
} from "src/builder/builder.types";
import { type SRDMonster } from "src/types/creatures";
import { convertFraction, getRpgSystem } from "../../../utils";
import { players } from "../players";
import type InitiativeTracker from "../../../main";
import { Modal } from "obsidian";
import copy from "fast-copy";
import { getId } from "../../../utils/creature";

export const playerCount = writable(0);

export class TableHeader {
    public active: boolean;
    id = getId();
    constructor(
        public text: string,
        public field: string,
        public type: SortFunctions,
        public func?: string
    ) {}
    private _func: (a: SRDMonster, b: SRDMonster) => number =
        this.getSortByType();
    private getSortByType() {
        switch (this.type) {
            case SortFunctions.LOCAL_COMPARE: {
                return (a: Record<string, any>, b: Record<string, any>) =>
                    (a[this.field] ?? "").localeCompare(b[this.field] ?? "");
            }
            case SortFunctions.CONVERT_FRACTION: {
                return (a: Record<string, any>, b: Record<string, any>) =>
                    convertFraction(a[this.field] ?? 0) -
                    convertFraction(b[this.field] ?? 0);
            }
            case SortFunctions.CUSTOM: {
                return new Function("a", "b", this.func!) as (
                    a: SRDMonster,
                    b: SRDMonster
                ) => number;
            }
        }
    }

    public sortAsc(a: SRDMonster, b: SRDMonster) {
        return this._func(a, b);
    }
    public sortDesc(a: SRDMonster, b: SRDMonster) {
        return this._func(b, a);
    }

    public toState(): TableHeaderState {
        return {
            text: this.text,
            field: this.field,
            type: this.type,
            ...(this.func && this.func.length ? { func: this.func } : {})
        };
    }

    public static fromState(state: TableHeaderState): TableHeader {
        return new TableHeader(state.text, state.field, state.type, state.func);
    }
    public static get defaultState() {
        return {
            text: "",
            field: "",
            type: SortFunctions.LOCAL_COMPARE
        };
    }
}

export const DEFAULT_HEADERS: TableHeaderState[] = [
    {
        text: "CR",
        field: "cr",
        type: SortFunctions.CONVERT_FRACTION
    },
    {
        text: "XP",
        field: "xp",
        type: SortFunctions.CONVERT_FRACTION
    },
    {
        text: "Type",
        field: "type",
        type: SortFunctions.LOCAL_COMPARE
    },
    {
        text: "Size",
        field: "size",
        type: SortFunctions.LOCAL_COMPARE
    },
    {
        text: "Alignment",
        field: "alignment",
        type: SortFunctions.LOCAL_COMPARE
    }
];

export const NAME_HEADER = TableHeader.fromState({
    text: "Name",
    field: "name",
    type: SortFunctions.LOCAL_COMPARE
});

export type BuiltTableStore = ReturnType<typeof createTable>;
export function createTable(plugin: InitiativeTracker, monsters: SRDMonster[]) {
    if (!plugin.data.builder) {
        plugin.data.builder = {
            sidebarIcon: true,
            showParty: true,
            showXP: true
        };
    }
    if (!plugin.data.builder.headers) {
        plugin.data.builder.headers = copy(DEFAULT_HEADERS);
    }
    if (!plugin.data.builder.xpColumnAdded) {
        const headers = plugin.data.builder.headers;
        if (!headers.some((header) => header.field === "xp")) {
            const position = headers.findIndex((header) => header.field === "cr");
            headers.splice(position < 0 ? headers.length : position + 1, 0,
                copy(DEFAULT_HEADERS.find((header) => header.field === "xp")));
        }
        plugin.data.builder.xpColumnAdded = true;
        plugin.saveSettings();
    }

    const store = writable<TableHeader[]>(
        plugin.data.builder.headers.map((h) => TableHeader.fromState(h))
    );
    const { subscribe, set, update } = store;
    const creatures = writable<SRDMonster[]>(copy(monsters));
    const xpFor = (creature: SRDMonster, levels = get(players.levels)): number | null => {
        const system = getRpgSystem(plugin);
        // CR-based systems do not express their difficulty values in XP.
        const value = system.valueUnit === "XP" ? system.getCreatureDifficulty(creature, levels) : creature.xp;
        return typeof value === "number" && Number.isFinite(value) ? value : null;
    };

    let sortDir = writable(true); //true == asc, false == des
    const allHeaders = derived(store, (headers) => {
        return [NAME_HEADER, ...headers];
    });
    const sort = (field: TableHeader) =>
        update((headers) => {
            if (field.active) {
                sortDir.update((v) => !v);
            } else {
                const curr = get(allHeaders).find((h) => h.active);
                if (curr) curr.active = false;
                field.active = true;
                sortDir.set(true);
            }

            creatures.update((creatures) => {
                const ascending = get(sortDir);
                const xpSort = field.field === "xp" && field.type === SortFunctions.CONVERT_FRACTION;
                const levels = get(players.levels);
                const experience = xpSort ? new Map(creatures.map((creature) => [creature, xpFor(creature, levels)])) : null;
                creatures.sort(
                    xpSort
                        ? (a, b) => {
                            const first = experience.get(a), second = experience.get(b);
                            if (first === null) return second === null ? 0 : 1;
                            if (second === null) return -1;
                            return (first - second) * (ascending ? 1 : -1);
                        }
                        : ascending
                        ? field.sortAsc.bind(field)
                        : field.sortDesc.bind(field)
                );
                return creatures;
            });
            return headers;
        });
    function updateAndSave(updater: Updater<TableHeader[]>): void {
        update(updater);
        plugin.saveSettings();
    }
    return {
        allHeaders,
        subscribe,
        set,
        update,
        sort,
        sortDir,
        creatures,
        xpFor,
        reset: () =>
            creatures.update(() => {
                return copy(monsters);
            }),
        setHeadersFromState: (headers: TableHeaderState[]) =>
            updateAndSave((_) => {
                plugin.data.builder.headers = headers;
                const newHeaders = headers.map((h) => TableHeader.fromState(h));
                const active = _.findIndex((h) => h.active);
                if (active >= 0 && active < newHeaders.length) {
                    newHeaders[active].active = true;
                }
                return newHeaders;
            }),
        resetToDefault: () =>
            updateAndSave((_) => {
                plugin.data.builder.headers = copy(DEFAULT_HEADERS);
                return plugin.data.builder.headers.map((h) =>
                    TableHeader.fromState(h)
                );
            })
    };
}

