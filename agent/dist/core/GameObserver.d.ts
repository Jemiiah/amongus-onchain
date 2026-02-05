import { type Address } from "viem";
import { GameState, GamePhase, Player, DeadBody, Location, Role, GameConfig, DiscussionMessage } from "../types.js";
export declare class GameObserver {
    private client;
    private factoryAddress;
    private gameAddress;
    private gameId;
    constructor(rpcUrl: string, factoryAddress: Address);
    getActiveGames(): Promise<bigint[]>;
    getAvailableGames(): Promise<{
        gameId: bigint;
        playerCount: bigint;
        wagerAmount: bigint;
    }[]>;
    getGameAddress(gameId: bigint): Promise<Address>;
    setGame(gameAddress: Address, gameId: bigint): void;
    private getGameContract;
    getGameState(): Promise<GameState>;
    getGameConfig(): Promise<GameConfig>;
    getPlayer(address: Address): Promise<Player>;
    getAllPlayers(): Promise<Address[]>;
    getPlayersAtLocation(location: Location): Promise<Address[]>;
    getMyRole(playerAddress: Address): Promise<Role>;
    getDeadBodies(): Promise<DeadBody[]>;
    getAdjacentRooms(location: Location): Promise<Location[]>;
    hasBodyAt(location: Location): Promise<boolean>;
    getDiscussionMessages(): Promise<DiscussionMessage[]>;
    isGameEnded(): Promise<boolean>;
    getPlayerCount(): Promise<number>;
    getCommitment(round: bigint, player: Address): Promise<{
        hash: `0x${string}`;
        timestamp: bigint;
        revealed: boolean;
    }>;
    hasCommitted(round: bigint, player: Address): Promise<boolean>;
    hasRevealed(round: bigint, player: Address): Promise<boolean>;
    getAlivePlayersInfo(): Promise<Player[]>;
    getTimeRemaining(): Promise<number>;
    waitForPhase(targetPhase: GamePhase, pollInterval?: number): Promise<void>;
}
//# sourceMappingURL=GameObserver.d.ts.map