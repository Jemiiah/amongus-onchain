"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameMemory = void 0;
const types_js_1 = require("../types.js");
class GameMemory {
    movements = [];
    kills = [];
    voteHistory = [];
    accusations = [];
    defenses = [];
    playerBehaviors = new Map();
    suspicionScores = new Map();
    myLocation = types_js_1.Location.Cafeteria;
    currentRound = 0n;
    knownLocations = new Map();
    // ============ RECORDING EVENTS ============
    recordMovement(player, from, to, round) {
        this.movements.push({ player, from, to, round });
        this.knownLocations.set(player, to);
        this.updatePlayerBehavior(player, (b) => {
            b.movementPattern.push(to);
        });
    }
    recordKill(victim, location, round, playersAtLocation) {
        this.kills.push({
            victim,
            location,
            round,
            possibleKillers: playersAtLocation.filter((p) => p !== victim),
        });
        // Increase suspicion for all players at location
        for (const player of playersAtLocation) {
            if (player !== victim) {
                this.addSuspicion(player, types_js_1.AccuseReason.NearBody, 30, round, `Near body at ${types_js_1.LocationNames[location]}`);
            }
        }
    }
    recordVote(round, votes, ejected, wasImpostor) {
        this.voteHistory.push({ round, votes, ejected, wasImpostor });
        // Update voting accuracy if we know the result
        if (ejected && wasImpostor !== null) {
            votes.forEach((votedFor, voter) => {
                if (votedFor === ejected) {
                    this.updatePlayerBehavior(voter, (b) => {
                        b.votingAccuracy = wasImpostor
                            ? (b.votingAccuracy + 1) / 2
                            : (b.votingAccuracy - 0.5) / 2;
                    });
                    // Decrease suspicion for correct votes
                    if (wasImpostor) {
                        this.adjustSuspicion(voter, -20);
                    }
                    else {
                        // Increase suspicion for voting innocent
                        this.addSuspicion(voter, types_js_1.AccuseReason.Inconsistent, 25, round, "Voted for innocent player");
                    }
                }
            });
        }
    }
    recordAccusation(message) {
        this.accusations.push(message);
        this.updatePlayerBehavior(message.target, (b) => {
            b.timesAccused++;
        });
        // Add suspicion based on accusation
        this.addSuspicion(message.target, message.reason, 15, BigInt(message.timestamp), "Accused by " + message.sender);
    }
    recordDefense(message) {
        this.defenses.push(message);
        this.updatePlayerBehavior(message.sender, (b) => {
            b.timesDefended++;
        });
    }
    recordReport(reporter, round) {
        this.updatePlayerBehavior(reporter, (b) => {
            b.reportedBodies++;
        });
        // Self-report suspicion (slight)
        this.addSuspicion(reporter, types_js_1.AccuseReason.SelfReport, 10, round, "Reported body");
    }
    recordTaskCompletion(player) {
        this.updatePlayerBehavior(player, (b) => {
            b.tasksCompleted++;
        });
        // Decrease suspicion for task completion
        this.adjustSuspicion(player, -10);
    }
    recordMeeting(caller, round) {
        this.updatePlayerBehavior(caller, (b) => {
            b.calledMeetings++;
        });
    }
    setMyLocation(location) {
        this.myLocation = location;
    }
    setCurrentRound(round) {
        this.currentRound = round;
    }
    // ============ SUSPICION MANAGEMENT ============
    addSuspicion(player, reason, weight, round, details) {
        let score = this.suspicionScores.get(player);
        if (!score) {
            score = { address: player, score: 0, reasons: [] };
            this.suspicionScores.set(player, score);
        }
        score.reasons.push({ type: reason, weight, round, details });
        score.score = Math.min(100, score.score + weight);
    }
    adjustSuspicion(player, delta) {
        let score = this.suspicionScores.get(player);
        if (!score) {
            score = { address: player, score: 50, reasons: [] };
            this.suspicionScores.set(player, score);
        }
        score.score = Math.max(0, Math.min(100, score.score + delta));
    }
    clearSuspicion(player) {
        this.suspicionScores.delete(player);
    }
    getSuspicionScore(player) {
        return this.suspicionScores.get(player);
    }
    getAllSuspicionScores() {
        return Array.from(this.suspicionScores.values()).sort((a, b) => b.score - a.score);
    }
    getMostSuspicious() {
        const scores = this.getAllSuspicionScores();
        return scores[0];
    }
    // ============ ANALYSIS METHODS ============
    getPlayerLastKnownLocation(player) {
        return this.knownLocations.get(player);
    }
    getPlayersWhoWereAt(location, round) {
        return this.movements
            .filter((m) => m.to === location && m.round === round)
            .map((m) => m.player);
    }
    wasPlayerNearVictim(player, victimLocation, round) {
        const playerMovements = this.movements.filter((m) => m.player === player && m.round === round);
        return playerMovements.some((m) => m.to === victimLocation || m.from === victimLocation);
    }
    getVoteHistoryFor(player) {
        const history = [];
        for (const record of this.voteHistory) {
            const vote = record.votes.get(player);
            if (vote !== undefined) {
                history.push({ votedFor: vote, round: record.round });
            }
        }
        return history;
    }
    getPlayersWhoVotedFor(target, round) {
        const record = this.voteHistory.find((v) => v.round === round);
        if (!record)
            return [];
        const voters = [];
        record.votes.forEach((votedFor, voter) => {
            if (votedFor === target) {
                voters.push(voter);
            }
        });
        return voters;
    }
    getPlayerBehavior(player) {
        return this.playerBehaviors.get(player);
    }
    // ============ PATTERN DETECTION ============
    detectFollowingPattern(player, target) {
        const playerMoves = this.movements.filter((m) => m.player === player);
        const targetMoves = this.movements.filter((m) => m.player === target);
        // Check if player frequently moves to same location as target
        let followCount = 0;
        for (const tm of targetMoves) {
            const followMove = playerMoves.find((pm) => pm.round === tm.round && pm.to === tm.to);
            if (followMove)
                followCount++;
        }
        return followCount >= 3;
    }
    detectNoTaskProgress(player, rounds) {
        const behavior = this.playerBehaviors.get(player);
        if (!behavior)
            return false;
        // If player has been in game for several rounds without completing tasks
        return behavior.tasksCompleted === 0 && this.currentRound > BigInt(rounds);
    }
    detectErraticMovement(player) {
        const behavior = this.playerBehaviors.get(player);
        if (!behavior || behavior.movementPattern.length < 4)
            return false;
        // Check for back-and-forth movement (suspicious)
        const pattern = behavior.movementPattern;
        let backForthCount = 0;
        for (let i = 2; i < pattern.length; i++) {
            if (pattern[i] === pattern[i - 2] && pattern[i] !== pattern[i - 1]) {
                backForthCount++;
            }
        }
        return backForthCount >= 2;
    }
    // ============ HELPERS ============
    updatePlayerBehavior(player, updater) {
        let behavior = this.playerBehaviors.get(player);
        if (!behavior) {
            behavior = {
                address: player,
                movementPattern: [],
                tasksCompleted: 0,
                timesAccused: 0,
                timesDefended: 0,
                votingAccuracy: 0.5,
                wasWithVictimCount: 0,
                reportedBodies: 0,
                calledMeetings: 0,
            };
            this.playerBehaviors.set(player, behavior);
        }
        updater(behavior);
    }
    // ============ SERIALIZATION ============
    toJSON() {
        return {
            movements: this.movements,
            kills: this.kills,
            voteHistory: this.voteHistory.map((v) => ({
                round: v.round.toString(),
                votes: Object.fromEntries(v.votes),
                ejected: v.ejected,
                wasImpostor: v.wasImpostor,
            })),
            suspicionScores: Object.fromEntries(this.suspicionScores),
            currentRound: this.currentRound.toString(),
        };
    }
    reset() {
        this.movements = [];
        this.kills = [];
        this.voteHistory = [];
        this.accusations = [];
        this.defenses = [];
        this.playerBehaviors.clear();
        this.suspicionScores.clear();
        this.knownLocations.clear();
        this.myLocation = types_js_1.Location.Cafeteria;
        this.currentRound = 0n;
    }
}
exports.GameMemory = GameMemory;
//# sourceMappingURL=GameMemory.js.map