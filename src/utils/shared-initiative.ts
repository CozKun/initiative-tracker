import type { Creature } from "./creature";

// Initiative grouping must not change encounter identity or merge saved colours.
export function sharesInitiative(a: Creature, b: Creature): boolean {
    if (a.player || b.player || a.static || b.static) return false;
    if (a.name !== b.name || a.friendly !== b.friendly) return false;
    if (a.path && b.path && a.path !== b.path) return false;
    const left = [a.modifier].flat();
    const right = [b.modifier].flat();
    return left.length === right.length && left.every((value, index) => value === right[index]);
}
