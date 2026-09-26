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

/** System-neutral bands. Boundaries retain their calculator's inclusive/exclusive semantics. */
export function systemDifficultyScale(value: number, thresholds: DifficultyThreshold[], firstLabel: string) {
    if (!Number.isFinite(value) || !thresholds.length || thresholds.some(t => !Number.isFinite(t.minValue))) return null;
    const ordered = [...thresholds].sort((a,b) => a.minValue-b.minValue);
    // Some calculators publish a budget for their lowest category, not a transition into it.
    const transitions = ordered.filter((t,i) => t.displayName !== firstLabel && t.minValue > 0
        && (i === ordered.length-1 || t.minValue !== ordered[i+1].minValue));
    if (!transitions.length || transitions.some((t,i) => i > 0 && t.minValue <= transitions[i-1].minValue)) return null;
    const entries = [{displayName:firstLabel, minValue:0, exclusive:false}, ...transitions];
    const firstWidth = firstLabel === 'Trivial' ? 10 : 100 / entries.length;
    const width = (100-firstWidth)/(entries.length-1);
    const bands = entries.map((t,i) => ({name:t.displayName, min:t.minValue, exclusive:!!t.exclusive,
        max:entries[i+1]?.minValue ?? null, maxExclusive:!(entries[i+1]?.exclusive ?? false),
        start:i === 0 ? 0 : firstWidth+(i-1)*width, width:i === 0 ? firstWidth : width}));
    const amount = Math.max(0,value);
    const index = bands.findLastIndex(b => b.exclusive ? amount > b.min : amount >= b.min);
    const current = bands[Math.max(0,index)];
    const span = current.max === null ? Math.max(1,current.min-bands[Math.max(0,index-1)].min) : current.max-current.min;
    const delta = Math.max(0,amount-current.min);
    return {bands,current,position:current.start+current.width*(current.max === null ? delta/(delta+span) : delta/span),
        next:bands[index+1] ? {name:bands[index+1].name, add:Math.max(0,bands[index+1].min-amount), exclusive:bands[index+1].exclusive} : null,
        previous:index > 0 ? {name:bands[index-1].name,boundary:current.min,inclusive:current.exclusive} : null};
}
