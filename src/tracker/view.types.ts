import type { BuilderPlayerSelection } from "src/builder/stores/players";
import type { CreatureState } from "src/types/creatures";

export interface InitiativeViewState {
    creatures: CreatureState[];
    state: boolean;
    name: string;
    round: number;
    logFile: string;
    newLog?: boolean;
    roll?: boolean;
    rollHP?: boolean;
    timestamp?: number;
    builderPlayers?: BuilderPlayerSelection[];
}

