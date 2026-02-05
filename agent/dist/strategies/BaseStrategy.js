"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseStrategy = void 0;
const types_js_1 = require("../types.js");
class BaseStrategy {
    name;
    constructor(name) {
        this.name = name;
    }
    getName() {
        return this.name;
    }
    // ============ HELPER METHODS ============
    getAdjacentLocations(location) {
        const adjacencyMap = {
            [types_js_1.Location.Cafeteria]: [types_js_1.Location.Admin, types_js_1.Location.MedBay, types_js_1.Location.UpperEngine],
            [types_js_1.Location.Admin]: [types_js_1.Location.Cafeteria, types_js_1.Location.Storage],
            [types_js_1.Location.Storage]: [types_js_1.Location.Admin, types_js_1.Location.Electrical, types_js_1.Location.LowerEngine],
            [types_js_1.Location.Electrical]: [types_js_1.Location.Storage, types_js_1.Location.LowerEngine],
            [types_js_1.Location.MedBay]: [types_js_1.Location.Cafeteria, types_js_1.Location.UpperEngine, types_js_1.Location.Security],
            [types_js_1.Location.UpperEngine]: [types_js_1.Location.Cafeteria, types_js_1.Location.MedBay, types_js_1.Location.Reactor],
            [types_js_1.Location.LowerEngine]: [types_js_1.Location.Storage, types_js_1.Location.Electrical, types_js_1.Location.Security],
            [types_js_1.Location.Security]: [types_js_1.Location.MedBay, types_js_1.Location.LowerEngine, types_js_1.Location.Reactor],
            [types_js_1.Location.Reactor]: [types_js_1.Location.UpperEngine, types_js_1.Location.Security],
        };
        return adjacencyMap[location] || [];
    }
    getVentDestination(location) {
        const ventMap = {
            [types_js_1.Location.Cafeteria]: types_js_1.Location.Admin,
            [types_js_1.Location.Admin]: types_js_1.Location.Cafeteria,
            [types_js_1.Location.Storage]: null,
            [types_js_1.Location.Electrical]: types_js_1.Location.MedBay,
            [types_js_1.Location.MedBay]: types_js_1.Location.Electrical,
            [types_js_1.Location.UpperEngine]: null,
            [types_js_1.Location.LowerEngine]: null,
            [types_js_1.Location.Security]: types_js_1.Location.Reactor,
            [types_js_1.Location.Reactor]: types_js_1.Location.Security,
        };
        return ventMap[location] ?? null;
    }
    randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
    getPlayersAtLocation(players, location) {
        return players.filter((p) => p.isAlive && p.location === location);
    }
    getIsolatedPlayers(players) {
        const locationCounts = new Map();
        for (const p of players) {
            if (p.isAlive) {
                locationCounts.set(p.location, (locationCounts.get(p.location) || 0) + 1);
            }
        }
        return players.filter((p) => p.isAlive && (locationCounts.get(p.location) || 0) === 1);
    }
    findNearestTaskRoom(from, completedTasks) {
        const taskRooms = [
            types_js_1.Location.Admin,
            types_js_1.Location.Storage,
            types_js_1.Location.Electrical,
            types_js_1.Location.MedBay,
            types_js_1.Location.UpperEngine,
            types_js_1.Location.LowerEngine,
            types_js_1.Location.Reactor,
        ];
        // Simple pathfinding - return adjacent task room or random task room
        const adjacent = this.getAdjacentLocations(from);
        const adjacentTaskRooms = adjacent.filter((loc) => taskRooms.includes(loc));
        if (adjacentTaskRooms.length > 0) {
            return this.randomChoice(adjacentTaskRooms);
        }
        // Otherwise move towards a task room
        return this.randomChoice(adjacent);
    }
}
exports.BaseStrategy = BaseStrategy;
//# sourceMappingURL=BaseStrategy.js.map