import { equivalent } from "src/encounter";
import type { Creature } from "./creature";

// Initiative grouping must not change encounter identity or merge saved colours.
export function sharesInitiative(a: Creature, b: Creature): boolean {
    if (a.player || b.player || a.static || b.static) return false;
    if (JSON.stringify(a.modifier) !== JSON.stringify(b.modifier)) return false;
    return equivalent({ ...a, baseColor: undefined }, { ...b, baseColor: undefined });
}
