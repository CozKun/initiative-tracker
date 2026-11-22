import { writable } from "svelte/store";
import { players } from "./players";
import { Creature } from "src/utils/creature";
import { copyColours, creatureCount, encounterGroupKey, type EncounterCreature } from "../encounter-creatures";

function createEncounter() {
    const store = writable<Map<EncounterCreature, number>>(new Map());
    // Keep catalogue entries untouched while subsequent adds find their draft row.
    let drafts = new WeakMap<EncounterCreature, EncounterCreature>();
    const resolve = (item: EncounterCreature) => drafts.get(item) ?? item;
    return {
        players,
        name: writable("Encounter"),
        subscribe: store.subscribe,
        add: (item: EncounterCreature) => store.update((monsters) => {
            let row = resolve(item);
            if (!monsters.has(row)) {
                const key = encounterGroupKey(Creature.from(item));
                row = [...monsters.keys()].find((draft) => encounterGroupKey(Creature.from(draft)) === key)
                    ?? { ...item, miniColours: copyColours(item, 1) };
                drafts.set(item, row);
            }
            const count = (monsters.get(row) ?? 0) + 1;
            row.miniColours = copyColours(row, count);
            monsters.set(row, count);
            return monsters;
        }),
        remove: (item: EncounterCreature, index?: number) => store.update((monsters) => {
            const row = resolve(item);
            const count = monsters.get(row);
            if (!count) return monsters;
            if (index !== undefined && (index < 0 || index >= count)) return monsters;
            if (count === 1) monsters.delete(row);
            else {
                const colours = copyColours(row, count);
                colours.splice(index ?? count - 1, 1);
                row.miniColours = colours;
                monsters.set(row, count - 1);
            }
            return monsters;
        }),
        delete: (item: EncounterCreature) => store.update((monsters) => {
            monsters.delete(resolve(item));
            return monsters;
        }),
        set: (item: EncounterCreature, rawCount: number) => store.update((monsters) => {
            if (!Number.isSafeInteger(rawCount) || rawCount < 1) return monsters;
            const row = resolve(item);
            const count = creatureCount(rawCount);
            row.miniColours = copyColours(row, count);
            monsters.set(row, count);
            return monsters;
        }),
        setMultiple: (creatures: [EncounterCreature, number][]) => {
            const monsters = new Map<EncounterCreature, number>();
            drafts = new WeakMap();
            for (const [item, rawCount] of creatures) {
                const count = creatureCount(rawCount);
                const row = { ...item, miniColours: copyColours(item, count) };
                drafts.set(item, row);
                monsters.set(row, count);
            }
            store.set(monsters);
        },
        empty: () => { drafts = new WeakMap(); store.set(new Map()); },
        setColour: (item: EncounterCreature, index: number, colour: string | null) => store.update((monsters) => {
            const row = resolve(item);
            const count = monsters.get(row);
            if (!count || index < 0 || index >= count) return monsters;
            row.miniColours = copyColours(row, count);
            row.miniColours[index] = colour;
            return monsters;
        }),
        update: (item: EncounterCreature) => store.update((monsters) => {
            const row = resolve(item);
            if (monsters.has(row)) monsters.set(row, monsters.get(row));
            return monsters;
        })
    };
}

export const encounter = createEncounter();
