import type { SRDMonster } from "src/types/creatures";
import { Creature } from "src/utils/creature";

export interface EncounterCreature extends SRDMonster {
    /** Per-copy colours in encounter order. Null explicitly means no indicator. */
    miniColours?: (string | null)[];
}

export function creatureCount(value: number): number {
    return Number.isSafeInteger(value) && value > 0 ? value : 1;
}

export function copyColours(creature: EncounterCreature, count: number): (string | null)[] {
    return Array.from({ length: creatureCount(count) }, (_, index) =>
        Array.isArray(creature.miniColours)
            ? creature.miniColours[index] ?? null
            : creature.baseColor ?? null
    );
}

export function expandEncounter(entries: Iterable<[EncounterCreature, number]>): Creature[] {
    return [...entries].flatMap(([source, count]) => copyColours(source, count).map((colour) => {
        const creature = Creature.new(Creature.from(source));
        creature.baseColor = colour ?? undefined;
        return creature;
    }));
}

export function groupEncounterCreatures(creatures: Creature[]): [EncounterCreature, number][] {
    const groups = new Map<string, [EncounterCreature, number]>();
    for (const creature of creatures) {
        const { id, baseColor, ...state } = creature.toJSON();
        const key = JSON.stringify(state);
        const group = groups.get(key);
        if (group) {
            group[0].miniColours.push(baseColor ?? null);
            group[1]++;
        } else {
            groups.set(key, [{ ...creature, miniColours: [baseColor ?? null] }, 1]);
        }
    }
    return [...groups.values()];
}

/** Keep the existing compact syntax unless individual colours need to be saved. */
export function encounterBlockCreatures(entries: Iterable<[EncounterCreature, number]>) {
    const result: Record<number, string | { creature: string; baseColor?: string; ally?: boolean; hidden?: boolean }>[] = [];
    for (const [creature, count] of entries) {
        const colours = copyColours(creature, count);
        if (!colours.some(Boolean)) {
            result.push({ [count]: `${creature.name}${creature.friendly ? ", friendly" : ""}${creature.hidden ? ", hidden" : ""}` });
        } else {
            result.push(...colours.map((baseColor) => ({
                1: { creature: creature.name, ...(baseColor ? { baseColor } : {}),
                    ...(creature.friendly ? { ally: true } : {}), ...(creature.hidden ? { hidden: true } : {}) }
            })));
        }
    }
    return result;
}
