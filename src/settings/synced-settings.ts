import type { InitiativeTrackerData } from "./settings.types";

function equal(left: unknown, right: unknown): boolean {
    return left === right || JSON.stringify(left) === JSON.stringify(right);
}

function snapshot(data: InitiativeTrackerData): InitiativeTrackerData {
    return JSON.parse(JSON.stringify(data));
}

export class SyncedSettings {
    private baseline: InitiativeTrackerData;
    private pending = Promise.resolve();

    constructor(initial: InitiativeTrackerData, private host: {
        current: () => InitiativeTrackerData;
        read: () => Promise<InitiativeTrackerData | null>;
        apply: (data: InitiativeTrackerData) => void;
        write: (data: InitiativeTrackerData) => Promise<void>;
    }) {
        this.baseline = snapshot(initial);
    }

    reconcile(save: boolean): Promise<void> {
        const operation = this.pending.then(async () => {
            const incoming = await this.host.read() ?? this.baseline;
            const local = this.host.current();
            const merged = { ...local };
            // A local change wins for its own setting. Whole combat snapshots stay intact.
            for (const key of Object.keys(incoming) as (keyof InitiativeTrackerData)[]) {
                if (key === "encounters" || !equal(local[key], this.baseline[key]) || equal(local[key], incoming[key])) continue;
                Object.assign(merged, { [key]: incoming[key] });
            }
            // Saved encounters are independent. A settings change on another device can
            // coexist with a new encounter, and changing one encounter preserves the others.
            const encounters = new Map(Object.entries(local.encounters));
            const remote = new Map(Object.entries(incoming.encounters));
            const names = new Set([...encounters.keys(), ...remote.keys()]);
            for (const name of names) {
                if (!equal(encounters.get(name), this.baseline.encounters[name])) continue;
                if (remote.has(name)) encounters.set(name, remote.get(name));
                else encounters.delete(name);
            }
            const mergedEncounters = Object.fromEntries(encounters);
            if (!equal(mergedEncounters, local.encounters)) merged.encounters = mergedEncounters;
            this.baseline = snapshot(incoming);
            this.host.apply(merged);
            if (save && !equal(merged, incoming)) {
                const saved = snapshot(merged);
                await this.host.write(saved);
                this.baseline = saved;
            }
        });
        // A failed operation should not prevent later writes or sync notifications.
        this.pending = operation.catch(() => {});
        return operation;
    }
}
