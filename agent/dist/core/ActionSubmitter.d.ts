import { type Address } from "viem";
import { Action, ActionCommitment, Location, SabotageType, MessageType, AccuseReason } from "../types.js";
export declare class ActionSubmitter {
    private walletClient;
    private publicClient;
    private account;
    private factoryAddress;
    private gameAddress;
    private chain;
    constructor(privateKey: `0x${string}`, rpcUrl: string, factoryAddress: Address);
    get address(): Address;
    setGame(gameAddress: Address): void;
    createGame(wagerAmount?: bigint): Promise<{
        gameId: bigint;
        gameAddress: Address;
        txHash: `0x${string}`;
    }>;
    joinGame(gameId: bigint, colorId: number, wagerAmount: bigint): Promise<`0x${string}`>;
    leaveGame(gameId: bigint): Promise<`0x${string}`>;
    startGame(): Promise<`0x${string}`>;
    generateSalt(): `0x${string}`;
    createActionCommitment(action: Action): ActionCommitment;
    commitAction(commitment: ActionCommitment): Promise<`0x${string}`>;
    revealAction(commitment: ActionCommitment): Promise<`0x${string}`>;
    submitVote(suspect: Address | null): Promise<`0x${string}`>;
    submitMessage(msgType: MessageType, target: Address, reason: AccuseReason, location: Location): Promise<`0x${string}`>;
    advancePhase(): Promise<`0x${string}`>;
    createMoveAction(destination: Location): Action;
    createDoTaskAction(taskId: number): Action;
    createFakeTaskAction(): Action;
    createKillAction(target: Address): Action;
    createReportAction(): Action;
    createCallMeetingAction(): Action;
    createVentAction(destination: Location): Action;
    createSabotageAction(sabotageType: SabotageType): Action;
    createSkipAction(): Action;
}
//# sourceMappingURL=ActionSubmitter.d.ts.map