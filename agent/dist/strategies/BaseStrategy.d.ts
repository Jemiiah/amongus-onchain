import type { Address } from "viem";
import { Action, GameState, Player, Location, DeadBody, DiscussionMessage } from "../types.js";
import { GameMemory } from "../memory/GameMemory.js";
import { GameObserver } from "../core/GameObserver.js";
export interface StrategyContext {
    gameState: GameState;
    myPlayer: Player;
    allPlayers: Player[];
    alivePlayers: Player[];
    deadBodies: DeadBody[];
    messages: DiscussionMessage[];
    memory: GameMemory;
    observer: GameObserver;
}
export interface IStrategy {
    /**
     * Decide what action to take this round
     */
    decideAction(context: StrategyContext): Promise<Action>;
    /**
     * Decide who to vote for during voting phase
     * Returns null to skip vote
     */
    decideVote(context: StrategyContext): Promise<Address | null>;
    /**
     * Generate discussion messages during discussion phase
     */
    generateMessages(context: StrategyContext): Promise<DiscussionMessage[]>;
    /**
     * Get the strategy name for logging
     */
    getName(): string;
}
export declare abstract class BaseStrategy implements IStrategy {
    protected name: string;
    constructor(name: string);
    getName(): string;
    abstract decideAction(context: StrategyContext): Promise<Action>;
    abstract decideVote(context: StrategyContext): Promise<Address | null>;
    abstract generateMessages(context: StrategyContext): Promise<DiscussionMessage[]>;
    protected getAdjacentLocations(location: Location): Location[];
    protected getVentDestination(location: Location): Location | null;
    protected randomChoice<T>(array: T[]): T;
    protected getPlayersAtLocation(players: Player[], location: Location): Player[];
    protected getIsolatedPlayers(players: Player[]): Player[];
    protected findNearestTaskRoom(from: Location, completedTasks: number): Location;
}
//# sourceMappingURL=BaseStrategy.d.ts.map