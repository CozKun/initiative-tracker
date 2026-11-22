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

export function encounterGroupKey(creature: Creature): string {
    return JSON.stringify([
        creature.name, creature.display, creature.path, creature.note, creature["statblock-link"],
        creature.max, creature.ac, creature.hit_dice, creature.rollHP ?? false, creature.modifier,
        creature.cr, creature.xp, creature.level, creature.marker, creature.hidden, creature.friendly,
        creature.static, creature.static ? creature.initiative : null
    ]);
}

export function groupEncounterCreatures(creatures: Creature[]): [EncounterCreature, number][] {
    const groups = new Map<string, [EncounterCreature, number]>();
    for (const creature of creatures) {
        const { id, baseColor, active, currentHP, currentMaxHP, tempHP, currentAC, status,
            enabled, autoUnconsciousName, initiative, ...definition } = creature.toJSON();
        const key = encounterGroupKey(creature);
        const group = groups.get(key);
        if (group) {
            group[0].miniColours.push(baseColor ?? null);
            group[1]++;
        } else {
            const row = { ...creature.creature, ...definition, miniColours: [baseColor ?? null] } as EncounterCreature;
            delete row.baseColor;
            if (creature.static) row.initiative = initiative;
            else delete row.initiative;
            groups.set(key, [row, 1]);
        }
    }
    return [...groups.values()];
}

export function encounterBlockCreatures(entries: Iterable<[EncounterCreature, number]>) {
    const result: Record<number, { creature: string; baseColor: string | null; ally?: boolean; hidden?: boolean }>[] = [];
    for (const [creature, count] of entries) {
        const colours = copyColours(creature, count);
        const details = { creature: creature.name, ...(creature.friendly ? { ally: true } : {}),
            ...(creature.hidden ? { hidden: true } : {}) };
        if (colours.every((colour) => colour === colours[0])) {
            result.push({ [colours.length]: { ...details, baseColor: colours[0] } });
        } else {
            result.push(...colours.map((baseColor) => ({ 1: { ...details, baseColor } })));
        }
    }
    return result;
}
