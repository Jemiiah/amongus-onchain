"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrewmateStrategy = void 0;
const types_js_1 = require("../types.js");
const BaseStrategy_js_1 = require("./BaseStrategy.js");
class CrewmateStrategy extends BaseStrategy_js_1.BaseStrategy {
    style;
    nextTaskId = 0;
    emergencyMeetingsUsed = 0;
    maxEmergencyMeetings = 1;
    constructor(style = "task-focused") {
        super(`Crewmate-${style}`);
        this.style = style;
    }
    async decideAction(context) {
        const { myPlayer, alivePlayers, deadBodies, memory } = context;
        const myLocation = myPlayer.location;
        // Priority 1: Report any body at my location
        const bodyHere = deadBodies.find((b) => b.location === myLocation && !b.reported);
        if (bodyHere) {
            return { type: types_js_1.ActionType.Report };
        }
        // Priority 2: Handle based on style
        switch (this.style) {
            case "task-focused":
                return this.taskFocusedAction(context);
            case "detective":
                return this.detectiveAction(context);
            case "group-safety":
                return this.groupSafetyAction(context);
            case "vigilante":
                return this.vigilanteAction(context);
            case "conservative":
                return this.conservativeAction(context);
            default:
                return this.taskFocusedAction(context);
        }
    }
    async taskFocusedAction(context) {
        const { myPlayer } = context;
        const myLocation = myPlayer.location;
        // If at a task room and have tasks to do, do task
        const taskRooms = [
            types_js_1.Location.Admin,
            types_js_1.Location.Storage,
            types_js_1.Location.Electrical,
            types_js_1.Location.MedBay,
            types_js_1.Location.UpperEngine,
            types_js_1.Location.LowerEngine,
            types_js_1.Location.Reactor,
        ];
        if (taskRooms.includes(myLocation) && myPlayer.tasksCompleted < myPlayer.totalTasks) {
            const taskId = this.nextTaskId;
            this.nextTaskId = (this.nextTaskId + 1) % myPlayer.totalTasks;
            return { type: types_js_1.ActionType.DoTask, taskId };
        }
        // Otherwise, move towards a task room
        const destination = this.findNearestTaskRoom(myLocation, myPlayer.tasksCompleted);
        return { type: types_js_1.ActionType.Move, destination };
    }
    async detectiveAction(context) {
        const { myPlayer, memory, alivePlayers } = context;
        const myLocation = myPlayer.location;
        // Go to Security to watch cameras if not there
        if (myLocation !== types_js_1.Location.Security) {
            const adjacent = this.getAdjacentLocations(myLocation);
            if (adjacent.includes(types_js_1.Location.Security)) {
                return { type: types_js_1.ActionType.Move, destination: types_js_1.Location.Security };
            }
            // Move towards Security
            // Simple: go to MedBay or LowerEngine as intermediate
            if (adjacent.includes(types_js_1.Location.MedBay)) {
                return { type: types_js_1.ActionType.Move, destination: types_js_1.Location.MedBay };
            }
            if (adjacent.includes(types_js_1.Location.LowerEngine)) {
                return { type: types_js_1.ActionType.Move, destination: types_js_1.Location.LowerEngine };
            }
        }
        // At Security - use cameras or do task
        if (myLocation === types_js_1.Location.Security) {
            // Alternate between using cams and doing tasks
            if (Math.random() > 0.5 && myPlayer.tasksCompleted < myPlayer.totalTasks) {
                return { type: types_js_1.ActionType.UseCams };
            }
        }
        // Default: do tasks
        return this.taskFocusedAction(context);
    }
    async groupSafetyAction(context) {
        const { myPlayer, alivePlayers } = context;
        const myLocation = myPlayer.location;
        // Find a location with other players
        const playersHere = this.getPlayersAtLocation(alivePlayers, myLocation);
        // If alone, move to find others
        if (playersHere.length <= 1) {
            // Move towards Cafeteria (central meeting point)
            const adjacent = this.getAdjacentLocations(myLocation);
            if (adjacent.includes(types_js_1.Location.Cafeteria)) {
                return { type: types_js_1.ActionType.Move, destination: types_js_1.Location.Cafeteria };
            }
            // Or move randomly
            return { type: types_js_1.ActionType.Move, destination: this.randomChoice(adjacent) };
        }
        // With others - do tasks
        if (myPlayer.tasksCompleted < myPlayer.totalTasks) {
            const taskRooms = [
                types_js_1.Location.Admin,
                types_js_1.Location.Storage,
                types_js_1.Location.Electrical,
                types_js_1.Location.MedBay,
                types_js_1.Location.UpperEngine,
                types_js_1.Location.LowerEngine,
                types_js_1.Location.Reactor,
            ];
            if (taskRooms.includes(myLocation)) {
                const taskId = this.nextTaskId;
                this.nextTaskId = (this.nextTaskId + 1) % myPlayer.totalTasks;
                return { type: types_js_1.ActionType.DoTask, taskId };
            }
        }
        // Move with others
        const adjacent = this.getAdjacentLocations(myLocation);
        return { type: types_js_1.ActionType.Move, destination: this.randomChoice(adjacent) };
    }
    async vigilanteAction(context) {
        const { myPlayer, memory, gameState } = context;
        const myLocation = myPlayer.location;
        // Check if we have high suspicion on someone
        const mostSuspicious = memory.getMostSuspicious();
        if (mostSuspicious &&
            mostSuspicious.score > 70 &&
            myLocation === types_js_1.Location.Cafeteria &&
            this.emergencyMeetingsUsed < this.maxEmergencyMeetings) {
            this.emergencyMeetingsUsed++;
            return { type: types_js_1.ActionType.CallMeeting };
        }
        // Otherwise focus on tasks
        return this.taskFocusedAction(context);
    }
    async conservativeAction(context) {
        // Very task-focused, avoids isolated areas
        const { myPlayer, alivePlayers } = context;
        const myLocation = myPlayer.location;
        const dangerousRooms = [types_js_1.Location.Electrical, types_js_1.Location.Reactor, types_js_1.Location.Security];
        // Avoid dangerous rooms unless with others
        const playersHere = this.getPlayersAtLocation(alivePlayers, myLocation);
        if (dangerousRooms.includes(myLocation) && playersHere.length <= 1) {
            const adjacent = this.getAdjacentLocations(myLocation);
            const safeRooms = adjacent.filter((r) => !dangerousRooms.includes(r));
            if (safeRooms.length > 0) {
                return { type: types_js_1.ActionType.Move, destination: this.randomChoice(safeRooms) };
            }
        }
        return this.taskFocusedAction(context);
    }
    async decideVote(context) {
        const { memory, alivePlayers, myPlayer } = context;
        // Get suspicion scores
        const scores = memory.getAllSuspicionScores();
        const threshold = this.style === "conservative" ? 80 : this.style === "vigilante" ? 50 : 65;
        // Find most suspicious alive player
        for (const score of scores) {
            const player = alivePlayers.find((p) => p.address === score.address && p.address !== myPlayer.address);
            if (player && score.score >= threshold) {
                return score.address;
            }
        }
        // If vigilante and have any suspicion, vote
        if (this.style === "vigilante" && scores.length > 0) {
            const score = scores[0];
            if (score.address !== myPlayer.address && score.score > 30) {
                return score.address;
            }
        }
        // Skip vote if no strong suspicion
        return null;
    }
    async generateMessages(context) {
        const { memory, myPlayer, deadBodies, gameState } = context;
        const messages = [];
        // If we found a body, share location
        const recentBody = deadBodies.find((b) => b.round === gameState.round);
        if (recentBody) {
            const mostSuspicious = memory.getMostSuspicious();
            if (mostSuspicious && mostSuspicious.score > 50) {
                messages.push({
                    sender: myPlayer.address,
                    msgType: types_js_1.MessageType.Accuse,
                    target: mostSuspicious.address,
                    reason: mostSuspicious.reasons[0]?.type || types_js_1.AccuseReason.NearBody,
                    location: recentBody.location,
                    timestamp: BigInt(Date.now()),
                });
            }
            else {
                // Share info about where body was found
                messages.push({
                    sender: myPlayer.address,
                    msgType: types_js_1.MessageType.Info,
                    target: "0x0000000000000000000000000000000000000000",
                    reason: types_js_1.AccuseReason.NearBody,
                    location: recentBody.location,
                    timestamp: BigInt(Date.now()),
                });
            }
        }
        return messages;
    }
}
exports.CrewmateStrategy = CrewmateStrategy;
//# sourceMappingURL=CrewmateStrategy.js.map