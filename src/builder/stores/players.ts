import { derived, get, writable } from "svelte/store";
import type { CreatureState } from "src/types/creatures";
import { Creature } from "src/utils/creature";

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
}
export type CombinedPlayer = Player | GenericPlayer;

export function enabledPlayerLevels(players: CombinedPlayer[]): number[] {
    return players.filter((p) => p.enabled && Number.isInteger(p.level) && p.level > 0)
        .flatMap((p) => Array.from({ length: Number.isSafeInteger(p.count) && p.count > 0 ? p.count : 0 }, () => p.level));
}

export function expandPlayers(items: CombinedPlayer[], findPlayer: (name: string) => Creature | undefined): Creature[] {
    let unnamed = 0;
    return items.filter((player) => player.enabled).flatMap((player) =>
        Array.from({ length: Number.isSafeInteger(player.count) && player.count > 0 ? player.count : 0 }, () => {
            const source = player.isPlayer ? findPlayer(player.name) : undefined;
            const creature = source ? Creature.new(source) : Creature.from({ ...player,
                name: player.isPlayer ? player.name : `Player ${++unnamed}` });
            if (source) creature.id = source.id;
            creature.player = true;
            creature.level = player.level;
            return creature;
        })
    );
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
                return players;
            }),
        addFromState: (state: CreatureState) =>
            update((players) => {
                const item = state as Player;
                item.isPlayer = true;
                if (!item.count || item.count <= 0) {
                    item.count = 1;
                }
                players.push(item);
                return players;
            }),
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

        switchParty: (items: Player[]) => {
            update((players) => {
                players = [...items, ...get(generics)];
                return players;
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
