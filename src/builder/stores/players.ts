import { derived, get, writable } from "svelte/store";
import type { CreatureState } from "src/types/creatures";
import { Creature, parsePlayerLevel, playerIdentity } from "src/utils/creature";

export const playerCount = writable(0);

export interface Player extends Partial<CreatureState> {
    level: number;
    name: string;
    isPlayer: true;
    enabled: boolean;
    count: number;
}
export interface GenericPlayer extends Partial<CreatureState> {
    level: number;
    isPlayer: false;
    enabled: boolean;
    count: number;
    includeInTracker?: boolean;
}
export type CombinedPlayer = Player | GenericPlayer;
export type BuilderPlayerSelection = Pick<CombinedPlayer, "isPlayer" | "level" | "enabled" | "count"> & { name?: string; includeInTracker?: boolean };

export function savePlayerSelection(items: CombinedPlayer[]): BuilderPlayerSelection[] {
    return items.map((player) => ({ isPlayer: player.isPlayer, name: player.name, level: player.level,
        enabled: player.enabled, count: player.count,
        ...(player.isPlayer === false ? { includeInTracker: player.includeInTracker !== false } : {}) }));
}

function trackerCount(player: CombinedPlayer): number {
    if (!player.enabled) return 0;
    if (player.isPlayer === true) return 1;
    if (player.includeInTracker === false) return 0;
    return Number.isSafeInteger(player.count) && player.count > 0 ? player.count : 0;
}

export function enabledPlayerLevels(players: CombinedPlayer[]): number[] {
    return players.flatMap((player) => {
        if (!player.enabled || !Number.isSafeInteger(player.count) || player.count <= 0) return [];
        const level = parsePlayerLevel(player.level);
        return level === undefined ? [] : Array.from({ length: player.count }, () => level);
    });
}

export function expandPlayers(items: CombinedPlayer[], findPlayer: (name: string) => Creature | undefined): Creature[] {
    let unnamed = 0;
    return items.flatMap((player) =>
        Array.from({ length: trackerCount(player) }, () => {
            const source = player.isPlayer ? findPlayer(player.name) : undefined;
            return Creature.from({ ...source, ...player, player: true,
                builderPlaceholder: !player.isPlayer,
                name: player.isPlayer ? player.name : `Player ${++unnamed}` });
        })
    );
}

function uniquePlayers(items: CombinedPlayer[]): CombinedPlayer[] {
    const seen = new Set<string>();
    return items.filter((item) => {
        if (!item.isPlayer) return true;
        const key = playerIdentity(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function createPlayers() {
    const store = writable<CombinedPlayer[]>([]);
    const { subscribe, set, update } = store;
    const party = derived(store, ($players) => {
        return $players.filter<Player>((p): p is Player => p.isPlayer);
    });
    const generics = derived(store, ($players) => {
        return $players.filter<GenericPlayer>(
            (p): p is GenericPlayer => p.isPlayer == false
        );
    });
    const count = derived(store, ($players) => {
        return [...$players].reduce((a, b) => a + b.count, 0);
    });

    return {
        subscribe,
        party,
        generics,
        levels: derived(store, enabledPlayerLevels),
        trackerCount: derived(store, (items) => items.reduce((sum, player) => sum + trackerCount(player), 0)),
        count,
        modifier: derived(count, ($count) =>
            $count < 3 ? 1 : $count > 5 ? -1 : 0
        ),
        average: derived(store, ($players) => {
            const levels = enabledPlayerLevels($players);
            return levels.length ? levels.reduce((sum, level) => sum + level, 0) / levels.length : 0;
        }),
        add: (item: CombinedPlayer) =>
            update((players) => {
                if (!item.count || item.count <= 0) {
                    item.count = 1;
                }
                players.push(item);
                return uniquePlayers(players);
            }),
        restore: (creatures: CreatureState[], selection?: BuilderPlayerSelection[]) => {
            const roster = creatures.filter((creature) => creature.player);
            if (selection) {
                set(uniquePlayers(selection.map((item) => ({
                    ...(item.isPlayer ? roster.find((creature) => !creature.builderPlaceholder && creature.name === item.name) : {}),
                    ...item
                } as CombinedPlayer))));
                return;
            }
            set(uniquePlayers(roster.map((creature) => ({
                ...creature, isPlayer: !creature.builderPlaceholder, count: 1, enabled: creature.enabled !== false
            } as CombinedPlayer))));
        },
        remove: (item: CombinedPlayer) =>
            update((players) => {
                players = players.filter((p) => p != item);
                return players;
            }),
        delete: (item: CombinedPlayer) =>
            update((players) => {
                players = players.filter((p) => p != item);
                return players;
            }),
        set: (item: CombinedPlayer, count: number) =>
            update((players) => {
                const player = players.find((p) => p == item);
                player!.count = count;
                return players;
            }),
        setLevel: (item: CombinedPlayer, level: number) =>
            update((players) => {
                const player = players.find((p) => p == item);
                player!.level = level;
                return players;
            }),
        setTrackerInclusion: (item: GenericPlayer, include: boolean) => update((players) => {
            item.includeInTracker = include;
            return players;
        }),

        switchParty: (items: Player[]) => {
            update((players) => {
                return uniquePlayers([...items, ...get(generics)]);
            });
        },
        empty: () => {
            return set([]);
        },
        toggleEnabled: (item: CombinedPlayer) =>
            update((players) => {
                const player = players.find((p) => p == item);
                player!.enabled = !player!.enabled;
                return players;
            })
    };
}

export const players = createPlayers();
