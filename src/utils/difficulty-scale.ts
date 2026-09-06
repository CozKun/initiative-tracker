import type { DifficultyThreshold } from "./rpg-system";

export type DifficultyBand = {
    name: string;
    min: number;
    max: number | null;
    start: number;
    width: number;
};

/** A categorical display, not a linear XP ruler. Encounter classification is unchanged. */
export function dnd55DifficultyScale(value: number, thresholds: DifficultyThreshold[]) {
    const [low, moderate, high] = ["Low", "Moderate", "High"].map(
        (name) => thresholds.find((threshold) => threshold.displayName === name)?.minValue
    );
    if (![low, moderate, high].every((n) => Number.isFinite(n) && n > 0)
        || moderate <= low || high <= moderate) return null;

    const bands: DifficultyBand[] = [
        { name: "Trivial", min: 0, max: low, start: 0, width: 10 },
        { name: "Low", min: low, max: moderate, start: 10, width: 30 },
        { name: "Moderate", min: moderate, max: high, start: 40, width: 30 },
        { name: "High", min: high, max: null, start: 70, width: 30 }
    ];
    const xp = Number.isFinite(value) ? Math.max(0, value) : 0;
    const index = bands.findLastIndex((band) => xp >= band.min);
    const band = bands[index];
    // The High band approaches the end without inventing an upper XP limit.
    const progress = band.max === null
        ? (xp - high) / (xp - high + high - moderate)
        : (xp - band.min) / (band.max - band.min);
    return {
        bands,
        current: band,
        next: index < bands.length - 1 ? { name: bands[index + 1].name, add: band.max - xp } : null,
        // Reaching a bracket's minimum still belongs to it. Remove enough whole
        // XP to cross below that boundary, including one XP at an exact threshold.
        previous: index > 0 ? { name: bands[index - 1].name, remove: Math.floor(xp - band.min) + 1 } : null,
        position: band.start + band.width * progress
    };
}
