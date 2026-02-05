import { Location, DiscussionMessage, AccuseReason, SuspicionScore } from "../types.js";
import type { Address } from "viem";
interface PlayerBehavior {
    address: Address;
    movementPattern: Location[];
    tasksCompleted: number;
    timesAccused: number;
    timesDefended: number;
    votingAccuracy: number;
    wasWithVictimCount: number;
    reportedBodies: number;
    calledMeetings: number;
}
export declare class GameMemory {
    private movements;
    private kills;
    private voteHistory;
    private accusations;
    private defenses;
    private playerBehaviors;
    private suspicionScores;
    private myLocation;
    private currentRound;
    private knownLocations;
    recordMovement(player: Address, from: Location, to: Location, round: bigint): void;
    recordKill(victim: Address, location: Location, round: bigint, playersAtLocation: Address[]): void;
    recordVote(round: bigint, votes: Map<Address, Address | null>, ejected: Address | null, wasImpostor: boolean | null): void;
    recordAccusation(message: DiscussionMessage): void;
    recordDefense(message: DiscussionMessage): void;
    recordReport(reporter: Address, round: bigint): void;
    recordTaskCompletion(player: Address): void;
    recordMeeting(caller: Address, round: bigint): void;
    setMyLocation(location: Location): void;
    setCurrentRound(round: bigint): void;
    addSuspicion(player: Address, reason: AccuseReason, weight: number, round: bigint, details?: string): void;
    adjustSuspicion(player: Address, delta: number): void;
    clearSuspicion(player: Address): void;
    getSuspicionScore(player: Address): SuspicionScore | undefined;
    getAllSuspicionScores(): SuspicionScore[];
    getMostSuspicious(): SuspicionScore | undefined;
    getPlayerLastKnownLocation(player: Address): Location | undefined;
    getPlayersWhoWereAt(location: Location, round: bigint): Address[];
    wasPlayerNearVictim(player: Address, victimLocation: Location, round: bigint): boolean;
    getVoteHistoryFor(player: Address): {
        votedFor: Address | null;
        round: bigint;
    }[];
    getPlayersWhoVotedFor(target: Address, round: bigint): Address[];
    getPlayerBehavior(player: Address): PlayerBehavior | undefined;
    detectFollowingPattern(player: Address, target: Address): boolean;
    detectNoTaskProgress(player: Address, rounds: number): boolean;
    detectErraticMovement(player: Address): boolean;
    private updatePlayerBehavior;
    toJSON(): object;
    reset(): void;
}
export {};
//# sourceMappingURL=GameMemory.d.ts.map