/** Empty, negative, or non-finite values must not silently alter an HP update. */
export function isValidHpMultiplier(value: unknown): boolean {
    return (typeof value === "number" || (typeof value === "string" && value.trim() !== ""))
        && Number.isFinite(Number(value)) && Number(value) >= 0;
}
