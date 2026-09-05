export function recentColours(value: unknown, applied?: string): string[] {
    const colours = [applied, ...(Array.isArray(value) ? value : [])];
    return [...new Set(colours
        .filter((colour): colour is string =>
            typeof colour === "string" && /^#[0-9a-f]{6}$/i.test(colour))
        .map((colour) => colour.toUpperCase()))].slice(0, 8);
}
