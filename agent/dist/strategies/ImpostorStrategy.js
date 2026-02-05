"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImpostorStrategy = void 0;
const types_js_1 = require("../types.js");
const BaseStrategy_js_1 = require("./BaseStrategy.js");
class ImpostorStrategy extends BaseStrategy_js_1.BaseStrategy {
    style;
    lastKillRound = 0n;
    killCooldown = 2n;
    framesTarget = null;
    builtTrustWith = new Set();
    fakingTaskAt = null;
    constructor(style = "stealth") {
        super(`Impostor-${style}`);
        this.style = style;
    }
    async decideAction(context) {
        const { gameState, myPlayer, alivePlayers, deadBodies, memory } = context;
        const myLocation = myPlayer.location;
        // Check if there's a body at my location - might need to report (self-report strategy)
        const bodyHere = deadBodies.find((b) => b.location === myLocation && !b.reported);
        switch (this.style) {
            case "stealth":
                return this.stealthAction(context, bodyHere);
            case "aggressive":
                return this.aggressiveAction(context, bodyHere);
            case "saboteur":
                return this.saboteurAction(context, bodyHere);
            case "social-manipulator":
                return this.socialManipulatorAction(context, bodyHere);
            case "frame-game":
                return this.frameGameAction(context, bodyHere);
            default:
                return this.stealthAction(context, bodyHere);
        }
    }
    canKill(context) {
        const { gameState } = context;
        return gameState.round - this.lastKillRound >= this.killCooldown;
    }
    findKillTarget(context) {
        const { myPlayer, alivePlayers, memory } = context;
        const myLocation = myPlayer.location;
        // Find isolated players at my location
        const playersHere = alivePlayers.filter((p) => p.location === myLocation && p.address !== myPlayer.address);
        if (playersHere.length === 0)
            return null;
        // Prefer players with low suspicion (won't be suspected of defending impostor)
        // And prefer isolated players
        const isolated = this.getIsolatedPlayers(alivePlayers).filter((p) => p.location === myLocation && p.address !== myPlayer.address);
        if (isolated.length > 0) {
            return this.randomChoice(isolated);
        }
        // If only one other player here, consider killing
        if (playersHere.length === 1) {
            return playersHere[0];
        }
        // Too many witnesses
        return null;
    }
    async stealthAction(context, bodyHere) {
        const { myPlayer, alivePlayers, gameState } = context;
        const myLocation = myPlayer.location;
        // If body here, leave quickly via vent if possible
        if (bodyHere) {
            const ventDest = this.getVentDestination(myLocation);
            if (ventDest) {
                return { type: types_js_1.ActionType.Vent, destination: ventDest };
            }
            // Otherwise move away
            const adjacent = this.getAdjacentLocations(myLocation);
            return { type: types_js_1.ActionType.Move, destination: this.randomChoice(adjacent) };
        }
        // Look for isolated targets
        const target = this.findKillTarget(context);
        if (target && this.canKill(context)) {
            // Check if truly isolated (no one else nearby)
            const playersHere = this.getPlayersAtLocation(alivePlayers, myLocation);
            if (playersHere.length === 2) {
                // Just us and target
                this.lastKillRound = gameState.round;
                return { type: types_js_1.ActionType.Kill, target: target.address };
            }
        }
        // Fake tasks or move to find isolated target
        if (Math.random() > 0.6) {
            return { type: types_js_1.ActionType.FakeTask };
        }
        // Move towards isolated areas
        const dangerousRooms = [types_js_1.Location.Electrical, types_js_1.Location.Reactor, types_js_1.Location.Security];
        const adjacent = this.getAdjacentLocations(myLocation);
        const dangerousAdjacent = adjacent.filter((r) => dangerousRooms.includes(r));
        if (dangerousAdjacent.length > 0) {
            return { type: types_js_1.ActionType.Move, destination: this.randomChoice(dangerousAdjacent) };
        }
        return { type: types_js_1.ActionType.Move, destination: this.randomChoice(adjacent) };
    }
    async aggressiveAction(context, bodyHere) {
        const { myPlayer, alivePlayers, gameState } = context;
        const myLocation = myPlayer.location;
        // Self-report to throw off suspicion
        if (bodyHere && Math.random() > 0.5) {
            return { type: types_js_1.ActionType.Report };
        }
        // Kill whenever possible
        const playersHere = alivePlayers.filter((p) => p.location === myLocation && p.address !== myPlayer.address);
        if (playersHere.length > 0 && this.canKill(context)) {
            const target = this.randomChoice(playersHere);
            this.lastKillRound = gameState.round;
            return { type: types_js_1.ActionType.Kill, target: target.address };
        }
        // Move to find targets
        const adjacent = this.getAdjacentLocations(myLocation);
        return { type: types_js_1.ActionType.Move, destination: this.randomChoice(adjacent) };
    }
    async saboteurAction(context, bodyHere) {
        const { myPlayer, gameState, alivePlayers } = context;
        const myLocation = myPlayer.location;
        // Escape from body scene
        if (bodyHere) {
            const ventDest = this.getVentDestination(myLocation);
            if (ventDest) {
                return { type: types_js_1.ActionType.Vent, destination: ventDest };
            }
        }
        // Sabotage frequently
        if (gameState.activeSabotage === types_js_1.SabotageType.None && Math.random() > 0.4) {
            // Choose strategic sabotage
            const sabotages = [types_js_1.SabotageType.Lights, types_js_1.SabotageType.Reactor, types_js_1.SabotageType.O2];
            return { type: types_js_1.ActionType.Sabotage, sabotage: this.randomChoice(sabotages) };
        }
        // During sabotage, hunt
        if (gameState.activeSabotage !== types_js_1.SabotageType.None) {
            const target = this.findKillTarget(context);
            if (target && this.canKill(context)) {
                this.lastKillRound = gameState.round;
                return { type: types_js_1.ActionType.Kill, target: target.address };
            }
        }
        // Fake tasks otherwise
        if (Math.random() > 0.5) {
            return { type: types_js_1.ActionType.FakeTask };
        }
        const adjacent = this.getAdjacentLocations(myLocation);
        return { type: types_js_1.ActionType.Move, destination: this.randomChoice(adjacent) };
    }
    async socialManipulatorAction(context, bodyHere) {
        const { myPlayer, alivePlayers, gameState, memory } = context;
        const myLocation = myPlayer.location;
        // Early game: build trust by staying with groups
        if (gameState.round < 4n) {
            // Stay with others
            const playersHere = this.getPlayersAtLocation(alivePlayers, myLocation);
            if (playersHere.length <= 1) {
                // Move to Cafeteria to be with others
                const adjacent = this.getAdjacentLocations(myLocation);
                if (adjacent.includes(types_js_1.Location.Cafeteria)) {
                    return { type: types_js_1.ActionType.Move, destination: types_js_1.Location.Cafeteria };
                }
            }
            // Fake task while with others
            return { type: types_js_1.ActionType.FakeTask };
        }
        // Mid-late game: betray
        if (bodyHere) {
            // Self-report to seem innocent
            return { type: types_js_1.ActionType.Report };
        }
        // Target players who trust us (we were with them)
        const target = this.findKillTarget(context);
        if (target && this.canKill(context)) {
            this.lastKillRound = gameState.round;
            return { type: types_js_1.ActionType.Kill, target: target.address };
        }
        // Continue social behavior
        if (Math.random() > 0.3) {
            return { type: types_js_1.ActionType.FakeTask };
        }
        const adjacent = this.getAdjacentLocations(myLocation);
        return { type: types_js_1.ActionType.Move, destination: this.randomChoice(adjacent) };
    }
    async frameGameAction(context, bodyHere) {
        const { myPlayer, alivePlayers, gameState, memory } = context;
        const myLocation = myPlayer.location;
        // Always self-report when finding body
        if (bodyHere) {
            // Frame someone who was nearby
            const playersHere = alivePlayers.filter((p) => p.location === myLocation && p.address !== myPlayer.address);
            if (playersHere.length > 0) {
                this.framesTarget = this.randomChoice(playersHere).address;
            }
            return { type: types_js_1.ActionType.Report };
        }
        // Kill and frame
        const target = this.findKillTarget(context);
        if (target && this.canKill(context)) {
            // Look for a third person to frame
            const playersHere = alivePlayers.filter((p) => p.location === myLocation && p.address !== myPlayer.address);
            if (playersHere.length >= 2) {
                // Kill one, frame another
                this.framesTarget = playersHere.find((p) => p.address !== target.address)?.address || null;
                this.lastKillRound = gameState.round;
                return { type: types_js_1.ActionType.Kill, target: target.address };
            }
        }
        // Move and fake tasks
        if (Math.random() > 0.5) {
            return { type: types_js_1.ActionType.FakeTask };
        }
        const adjacent = this.getAdjacentLocations(myLocation);
        return { type: types_js_1.ActionType.Move, destination: this.randomChoice(adjacent) };
    }
    async decideVote(context) {
        const { memory, alivePlayers, myPlayer } = context;
        // Frame game: vote for framed target
        if (this.style === "frame-game" && this.framesTarget) {
            const target = alivePlayers.find((p) => p.address === this.framesTarget);
            if (target) {
                return this.framesTarget;
            }
        }
        // Social manipulator: agree with majority or accuse someone sus
        const scores = memory.getAllSuspicionScores();
        for (const score of scores) {
            // Don't vote for self obviously
            if (score.address === myPlayer.address)
                continue;
            const player = alivePlayers.find((p) => p.address === score.address);
            if (player && score.score > 40) {
                return score.address;
            }
        }
        // Vote randomly for someone (not self)
        if (this.style === "aggressive") {
            const others = alivePlayers.filter((p) => p.address !== myPlayer.address);
            if (others.length > 0) {
                return this.randomChoice(others).address;
            }
        }
        // Skip vote to seem unsure
        return null;
    }
    async generateMessages(context) {
        const { memory, myPlayer, deadBodies, gameState, alivePlayers } = context;
        const messages = [];
        // Frame game: accuse framed target
        if (this.style === "frame-game" && this.framesTarget) {
            messages.push({
                sender: myPlayer.address,
                msgType: types_js_1.MessageType.Accuse,
                target: this.framesTarget,
                reason: types_js_1.AccuseReason.NearBody,
                location: deadBodies[deadBodies.length - 1]?.location || types_js_1.Location.Cafeteria,
                timestamp: BigInt(Date.now()),
            });
            return messages;
        }
        // Social manipulator: vouch for someone to build alliance
        if (this.style === "social-manipulator") {
            const others = alivePlayers.filter((p) => p.address !== myPlayer.address);
            if (others.length > 0) {
                const toVouchFor = this.randomChoice(others);
                messages.push({
                    sender: myPlayer.address,
                    msgType: types_js_1.MessageType.Vouch,
                    target: toVouchFor.address,
                    reason: types_js_1.AccuseReason.NearBody, // Placeholder
                    location: myPlayer.location,
                    timestamp: BigInt(Date.now()),
                });
            }
            return messages;
        }
        // Accuse someone with existing suspicion to deflect
        const scores = memory.getAllSuspicionScores();
        if (scores.length > 0 && scores[0].address !== myPlayer.address) {
            messages.push({
                sender: myPlayer.address,
                msgType: types_js_1.MessageType.Accuse,
                target: scores[0].address,
                reason: scores[0].reasons[0]?.type || types_js_1.AccuseReason.SuspiciousMovement,
                location: myPlayer.location,
                timestamp: BigInt(Date.now()),
            });
        }
        return messages;
    }
}
exports.ImpostorStrategy = ImpostorStrategy;
//# sourceMappingURL=ImpostorStrategy.js.map