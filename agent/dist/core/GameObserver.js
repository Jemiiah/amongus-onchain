"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameObserver = void 0;
const viem_1 = require("viem");
const index_js_1 = require("../abi/index.js");
class GameObserver {
    client;
    factoryAddress;
    gameAddress = null;
    gameId = null;
    constructor(rpcUrl, factoryAddress) {
        this.client = (0, viem_1.createPublicClient)({
            transport: (0, viem_1.http)(rpcUrl),
        });
        this.factoryAddress = factoryAddress;
    }
    // ============ FACTORY QUERIES ============
    async getActiveGames() {
        const factory = (0, viem_1.getContract)({
            address: this.factoryAddress,
            abi: index_js_1.AmongUsGameFactoryABI,
            client: this.client,
        });
        const games = (await factory.read.getActiveGames());
        return games;
    }
    async getAvailableGames() {
        const factory = (0, viem_1.getContract)({
            address: this.factoryAddress,
            abi: index_js_1.AmongUsGameFactoryABI,
            client: this.client,
        });
        const [gameIds, playerCounts, wagerAmounts] = (await factory.read.getAvailableGames());
        return gameIds.map((id, i) => ({
            gameId: id,
            playerCount: playerCounts[i],
            wagerAmount: wagerAmounts[i],
        }));
    }
    async getGameAddress(gameId) {
        const factory = (0, viem_1.getContract)({
            address: this.factoryAddress,
            abi: index_js_1.AmongUsGameFactoryABI,
            client: this.client,
        });
        return (await factory.read.games([gameId]));
    }
    // ============ GAME STATE QUERIES ============
    setGame(gameAddress, gameId) {
        this.gameAddress = gameAddress;
        this.gameId = gameId;
    }
    getGameContract() {
        if (!this.gameAddress) {
            throw new Error("No game address set. Call setGame() first.");
        }
        return (0, viem_1.getContract)({
            address: this.gameAddress,
            abi: index_js_1.AmongUsGameABI,
            client: this.client,
        });
    }
    async getGameState() {
        const game = this.getGameContract();
        const state = (await game.read.state());
        return {
            gameId: state[0],
            phase: Number(state[1]),
            round: state[2],
            phaseEndTime: state[3],
            alivePlayers: Number(state[4]),
            aliveCrewmates: Number(state[5]),
            aliveImpostors: Number(state[6]),
            totalTasksCompleted: Number(state[7]),
            totalTasksRequired: Number(state[8]),
            activeSabotage: Number(state[9]),
            sabotageEndTime: state[10],
            winner: state[11],
            crewmatesWon: state[12],
        };
    }
    async getGameConfig() {
        const game = this.getGameContract();
        const config = (await game.read.config());
        return {
            minPlayers: Number(config[0]),
            maxPlayers: Number(config[1]),
            numImpostors: Number(config[2]),
            wagerAmount: config[3],
            actionTimeout: config[4],
            voteTimeout: config[5],
            discussionTime: config[6],
            tasksPerPlayer: Number(config[7]),
            visualTasks: config[8],
            emergencyMeetings: Number(config[9]),
            killCooldown: config[10],
        };
    }
    async getPlayer(address) {
        const game = this.getGameContract();
        const player = (await game.read.players([address]));
        return {
            address: player[0],
            colorId: Number(player[1]),
            role: Number(player[2]),
            location: Number(player[3]),
            isAlive: player[4],
            tasksCompleted: Number(player[5]),
            totalTasks: Number(player[6]),
            wagerAmount: player[7],
            hasVoted: player[8],
            lastActionRound: player[9],
        };
    }
    async getAllPlayers() {
        const game = this.getGameContract();
        return (await game.read.getAllPlayers());
    }
    async getPlayersAtLocation(location) {
        const game = this.getGameContract();
        return (await game.read.getPlayersAtLocation([location]));
    }
    async getMyRole(playerAddress) {
        const game = this.getGameContract();
        // This would need to be called from the player's account
        // For now, return from player struct (which shows None until revealed)
        const player = await this.getPlayer(playerAddress);
        return player.role;
    }
    async getDeadBodies() {
        const game = this.getGameContract();
        const bodies = (await game.read.getDeadBodies());
        return bodies.map((body) => ({
            victim: body[0],
            location: Number(body[1]),
            round: body[2],
            reported: body[3],
        }));
    }
    async getAdjacentRooms(location) {
        const game = this.getGameContract();
        const rooms = (await game.read.getAdjacentRooms([location]));
        return rooms.map((r) => r);
    }
    async hasBodyAt(location) {
        const game = this.getGameContract();
        return (await game.read.hasBodyAt([location]));
    }
    async getDiscussionMessages() {
        const game = this.getGameContract();
        const messages = (await game.read.getMessages());
        return messages.map((msg) => ({
            sender: msg[0],
            msgType: Number(msg[1]),
            target: msg[2],
            reason: Number(msg[3]),
            location: Number(msg[4]),
            timestamp: msg[5],
        }));
    }
    async isGameEnded() {
        const game = this.getGameContract();
        return (await game.read.isGameEnded());
    }
    async getPlayerCount() {
        const game = this.getGameContract();
        return Number(await game.read.getPlayerCount());
    }
    // ============ COMMITMENT QUERIES ============
    async getCommitment(round, player) {
        const game = this.getGameContract();
        const commitment = (await game.read.commitments([round, player]));
        return {
            hash: commitment[0],
            timestamp: commitment[1],
            revealed: commitment[2],
        };
    }
    async hasCommitted(round, player) {
        const commitment = await this.getCommitment(round, player);
        return (commitment.hash !==
            "0x0000000000000000000000000000000000000000000000000000000000000000");
    }
    async hasRevealed(round, player) {
        const commitment = await this.getCommitment(round, player);
        return commitment.revealed;
    }
    // ============ HELPER METHODS ============
    async getAlivePlayersInfo() {
        const addresses = await this.getAllPlayers();
        const players = [];
        for (const addr of addresses) {
            const player = await this.getPlayer(addr);
            if (player.isAlive) {
                players.push(player);
            }
        }
        return players;
    }
    async getTimeRemaining() {
        const state = await this.getGameState();
        const now = BigInt(Math.floor(Date.now() / 1000));
        const remaining = state.phaseEndTime - now;
        return remaining > 0n ? Number(remaining) : 0;
    }
    async waitForPhase(targetPhase, pollInterval = 2000) {
        return new Promise((resolve) => {
            const check = async () => {
                const state = await this.getGameState();
                if (state.phase === targetPhase) {
                    resolve();
                }
                else {
                    setTimeout(check, pollInterval);
                }
            };
            check();
        });
    }
}
exports.GameObserver = GameObserver;
//# sourceMappingURL=GameObserver.js.map