"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Agent = void 0;
const viem_1 = require("viem");
const winston_1 = __importDefault(require("winston"));
const types_js_1 = require("../types.js");
const GameObserver_js_1 = require("./GameObserver.js");
const ActionSubmitter_js_1 = require("./ActionSubmitter.js");
const GameMemory_js_1 = require("../memory/GameMemory.js");
const CrewmateStrategy_js_1 = require("../strategies/CrewmateStrategy.js");
const ImpostorStrategy_js_1 = require("../strategies/ImpostorStrategy.js");
class Agent {
    config;
    observer;
    submitter;
    memory;
    logger;
    currentGameId = null;
    currentGameAddress = null;
    myRole = types_js_1.Role.None;
    strategy = null;
    pendingCommitment = null;
    crewmateStyle;
    impostorStyle;
    constructor(config, crewmateStyle = "task-focused", impostorStyle = "stealth") {
        this.config = config;
        this.observer = new GameObserver_js_1.GameObserver(config.rpcUrl, config.factoryAddress);
        this.submitter = new ActionSubmitter_js_1.ActionSubmitter(config.privateKey, config.rpcUrl, config.factoryAddress);
        this.memory = new GameMemory_js_1.GameMemory();
        this.crewmateStyle = crewmateStyle;
        this.impostorStyle = impostorStyle;
        this.logger = winston_1.default.createLogger({
            level: "info",
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.printf(({ timestamp, level, message }) => {
                return `[${timestamp}] [${config.agentName}] ${level.toUpperCase()}: ${message}`;
            })),
            transports: [new winston_1.default.transports.Console()],
        });
    }
    get address() {
        return this.submitter.address;
    }
    // ============ GAME LIFECYCLE ============
    async findAndJoinGame(maxWager = (0, viem_1.parseEther)("0.01")) {
        this.logger.info("Looking for available games...");
        const availableGames = await this.observer.getAvailableGames();
        const suitableGames = availableGames.filter((g) => g.wagerAmount <= maxWager);
        if (suitableGames.length === 0) {
            this.logger.info("No suitable games found");
            return null;
        }
        // Join the first suitable game
        const game = suitableGames[0];
        this.logger.info(`Joining game ${game.gameId} with wager ${game.wagerAmount}`);
        const colorId = Math.floor(Math.random() * 12);
        await this.submitter.joinGame(game.gameId, colorId, game.wagerAmount);
        const gameAddress = await this.observer.getGameAddress(game.gameId);
        this.setGame(game.gameId, gameAddress);
        return { gameId: game.gameId, gameAddress };
    }
    async createAndJoinGame(wagerAmount = (0, viem_1.parseEther)("0.01")) {
        this.logger.info(`Creating new game with wager ${wagerAmount}`);
        const result = await this.submitter.createGame(wagerAmount);
        this.setGame(result.gameId, result.gameAddress);
        return { gameId: result.gameId, gameAddress: result.gameAddress };
    }
    setGame(gameId, gameAddress) {
        this.currentGameId = gameId;
        this.currentGameAddress = gameAddress;
        this.observer.setGame(gameAddress, gameId);
        this.submitter.setGame(gameAddress);
        this.memory.reset();
        this.myRole = types_js_1.Role.None;
        this.strategy = null;
        this.pendingCommitment = null;
        this.logger.info(`Set active game: ${gameId} at ${gameAddress}`);
    }
    async startGame() {
        this.logger.info("Starting game...");
        await this.submitter.startGame();
    }
    // ============ MAIN GAME LOOP ============
    async playGame() {
        if (!this.currentGameId || !this.currentGameAddress) {
            throw new Error("No game set. Call setGame() or findAndJoinGame() first.");
        }
        this.logger.info("Starting game loop...");
        while (true) {
            try {
                const gameState = await this.observer.getGameState();
                this.memory.setCurrentRound(gameState.round);
                if (gameState.phase === types_js_1.GamePhase.Ended) {
                    this.logger.info(`Game ended! Crewmates won: ${gameState.crewmatesWon}`);
                    break;
                }
                await this.handlePhase(gameState);
                // Small delay between checks
                await this.sleep(1000);
            }
            catch (error) {
                this.logger.error(`Error in game loop: ${error}`);
                await this.sleep(2000);
            }
        }
    }
    async handlePhase(gameState) {
        switch (gameState.phase) {
            case types_js_1.GamePhase.Lobby:
                // Wait for game to start
                this.logger.debug("Waiting in lobby...");
                break;
            case types_js_1.GamePhase.Starting:
                // Roles being assigned
                this.logger.info("Game starting, roles being assigned...");
                break;
            case types_js_1.GamePhase.ActionCommit:
                await this.handleActionCommit(gameState);
                break;
            case types_js_1.GamePhase.ActionReveal:
                await this.handleActionReveal(gameState);
                break;
            case types_js_1.GamePhase.Discussion:
                await this.handleDiscussion(gameState);
                break;
            case types_js_1.GamePhase.Voting:
                await this.handleVoting(gameState);
                break;
            case types_js_1.GamePhase.VoteResult:
                // Wait for result processing
                this.logger.debug("Waiting for vote result...");
                break;
            default:
                this.logger.debug(`Unknown phase: ${gameState.phase}`);
        }
    }
    // ============ PHASE HANDLERS ============
    async handleActionCommit(gameState) {
        // Check if already committed
        const hasCommitted = await this.observer.hasCommitted(gameState.round, this.address);
        if (hasCommitted) {
            this.logger.debug("Already committed action for this round");
            return;
        }
        // Initialize role and strategy if not done
        if (this.myRole === types_js_1.Role.None || !this.strategy) {
            await this.initializeRoleAndStrategy();
        }
        // Build context
        const context = await this.buildStrategyContext(gameState);
        // Decide action
        const action = await this.strategy.decideAction(context);
        this.logger.info(`Decided action: ${JSON.stringify(action)}`);
        // Create and store commitment
        this.pendingCommitment = this.submitter.createActionCommitment(action);
        // Submit commitment
        await this.submitter.commitAction(this.pendingCommitment);
        this.logger.info(`Committed action hash: ${this.pendingCommitment.hash}`);
    }
    async handleActionReveal(gameState) {
        // Check if already revealed
        const hasRevealed = await this.observer.hasRevealed(gameState.round, this.address);
        if (hasRevealed) {
            this.logger.debug("Already revealed action for this round");
            return;
        }
        if (!this.pendingCommitment) {
            this.logger.error("No pending commitment to reveal!");
            return;
        }
        // Reveal action
        await this.submitter.revealAction(this.pendingCommitment);
        this.logger.info(`Revealed action: ${JSON.stringify(this.pendingCommitment.action)}`);
        // Update memory
        const myPlayer = await this.observer.getPlayer(this.address);
        this.memory.setMyLocation(myPlayer.location);
        this.pendingCommitment = null;
    }
    async handleDiscussion(gameState) {
        if (!this.strategy)
            return;
        const context = await this.buildStrategyContext(gameState);
        // Generate and submit discussion messages
        const messages = await this.strategy.generateMessages(context);
        for (const msg of messages) {
            try {
                await this.submitter.submitMessage(msg.msgType, msg.target, msg.reason, msg.location);
                this.logger.info(`Sent message: ${JSON.stringify(msg)}`);
            }
            catch (error) {
                this.logger.error(`Failed to send message: ${error}`);
            }
        }
        // Record messages in memory
        const allMessages = await this.observer.getDiscussionMessages();
        for (const msg of allMessages) {
            if (msg.msgType === 0) {
                // Accuse
                this.memory.recordAccusation(msg);
            }
            else if (msg.msgType === 1) {
                // Defend
                this.memory.recordDefense(msg);
            }
        }
    }
    async handleVoting(gameState) {
        // Check if already voted
        const myPlayer = await this.observer.getPlayer(this.address);
        if (myPlayer.hasVoted) {
            this.logger.debug("Already voted this round");
            return;
        }
        if (!this.strategy) {
            await this.initializeRoleAndStrategy();
        }
        const context = await this.buildStrategyContext(gameState);
        // Decide vote
        const voteTarget = await this.strategy.decideVote(context);
        this.logger.info(`Voting for: ${voteTarget || "SKIP"}`);
        // Submit vote
        await this.submitter.submitVote(voteTarget);
    }
    // ============ HELPERS ============
    async initializeRoleAndStrategy() {
        // In actual game, role is revealed to player
        // For now, we need to determine our role from the contract
        const myPlayer = await this.observer.getPlayer(this.address);
        // The contract stores role privately, but we can infer from gameplay
        // For MVP, let's assume we can read our role (this would need contract support)
        // In production, the agent would call getMyRole() which only works for the player
        // For now, randomly assign for testing - in real game, read from contract
        this.myRole = Math.random() > 0.8 ? types_js_1.Role.Impostor : types_js_1.Role.Crewmate;
        if (this.myRole === types_js_1.Role.Impostor) {
            this.strategy = new ImpostorStrategy_js_1.ImpostorStrategy(this.impostorStyle);
            this.logger.info(`Assigned role: IMPOSTOR (${this.impostorStyle})`);
        }
        else {
            this.strategy = new CrewmateStrategy_js_1.CrewmateStrategy(this.crewmateStyle);
            this.logger.info(`Assigned role: CREWMATE (${this.crewmateStyle})`);
        }
    }
    async buildStrategyContext(gameState) {
        const allPlayerAddresses = await this.observer.getAllPlayers();
        const allPlayers = [];
        const alivePlayers = [];
        for (const addr of allPlayerAddresses) {
            const player = await this.observer.getPlayer(addr);
            allPlayers.push(player);
            if (player.isAlive) {
                alivePlayers.push(player);
            }
        }
        const myPlayer = allPlayers.find((p) => p.address === this.address);
        const deadBodies = await this.observer.getDeadBodies();
        const messages = await this.observer.getDiscussionMessages();
        return {
            gameState,
            myPlayer,
            allPlayers,
            alivePlayers,
            deadBodies,
            messages,
            memory: this.memory,
            observer: this.observer,
        };
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    // ============ PUBLIC GETTERS ============
    getRole() {
        return this.myRole;
    }
    getStrategy() {
        return this.strategy;
    }
    getMemory() {
        return this.memory;
    }
    getCurrentGameId() {
        return this.currentGameId;
    }
}
exports.Agent = Agent;
//# sourceMappingURL=Agent.js.map