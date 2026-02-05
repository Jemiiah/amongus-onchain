"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionSubmitter = void 0;
const viem_1 = require("viem");
const accounts_1 = require("viem/accounts");
const index_js_1 = require("../abi/index.js");
const types_js_1 = require("../types.js");
// Define Monad chain (or local)
const monadTestnet = (0, viem_1.defineChain)({
    id: 10143,
    name: "Monad Testnet",
    nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
    rpcUrls: {
        default: { http: ["https://testnet-rpc.monad.xyz"] },
    },
});
const localhost = (0, viem_1.defineChain)({
    id: 31337,
    name: "Localhost",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: {
        default: { http: ["http://localhost:8545"] },
    },
});
class ActionSubmitter {
    walletClient;
    publicClient;
    account;
    factoryAddress;
    gameAddress = null;
    chain;
    constructor(privateKey, rpcUrl, factoryAddress) {
        this.account = (0, accounts_1.privateKeyToAccount)(privateKey);
        // Determine chain based on RPC URL
        this.chain = rpcUrl.includes("localhost") || rpcUrl.includes("127.0.0.1")
            ? localhost
            : monadTestnet;
        this.publicClient = (0, viem_1.createPublicClient)({
            chain: this.chain,
            transport: (0, viem_1.http)(rpcUrl),
        });
        this.walletClient = (0, viem_1.createWalletClient)({
            account: this.account,
            chain: this.chain,
            transport: (0, viem_1.http)(rpcUrl),
        });
        this.factoryAddress = factoryAddress;
    }
    get address() {
        return this.account.address;
    }
    setGame(gameAddress) {
        this.gameAddress = gameAddress;
    }
    // ============ GAME MANAGEMENT ============
    async createGame(wagerAmount = (0, viem_1.parseEther)("0.01")) {
        const hash = await this.walletClient.writeContract({
            chain: this.chain,
            account: this.account,
            address: this.factoryAddress,
            abi: index_js_1.AmongUsGameFactoryABI,
            functionName: "createGame",
            args: [],
            value: wagerAmount,
        });
        await this.publicClient.waitForTransactionReceipt({ hash });
        const gameCount = (await this.publicClient.readContract({
            address: this.factoryAddress,
            abi: index_js_1.AmongUsGameFactoryABI,
            functionName: "gameCount",
        }));
        const gameId = gameCount - 1n;
        const gameAddress = (await this.publicClient.readContract({
            address: this.factoryAddress,
            abi: index_js_1.AmongUsGameFactoryABI,
            functionName: "games",
            args: [gameId],
        }));
        this.gameAddress = gameAddress;
        return { gameId, gameAddress, txHash: hash };
    }
    async joinGame(gameId, colorId, wagerAmount) {
        const hash = await this.walletClient.writeContract({
            chain: this.chain,
            address: this.factoryAddress,
            abi: index_js_1.AmongUsGameFactoryABI,
            functionName: "joinGame",
            args: [gameId, colorId],
            value: wagerAmount,
        });
        await this.publicClient.waitForTransactionReceipt({ hash });
        const gameAddress = (await this.publicClient.readContract({
            address: this.factoryAddress,
            abi: index_js_1.AmongUsGameFactoryABI,
            functionName: "games",
            args: [gameId],
        }));
        this.gameAddress = gameAddress;
        return hash;
    }
    async leaveGame(gameId) {
        const hash = await this.walletClient.writeContract({
            chain: this.chain,
            address: this.factoryAddress,
            abi: index_js_1.AmongUsGameFactoryABI,
            functionName: "leaveGame",
            args: [gameId],
        });
        await this.publicClient.waitForTransactionReceipt({ hash });
        return hash;
    }
    async startGame() {
        if (!this.gameAddress)
            throw new Error("No game set");
        const hash = await this.walletClient.writeContract({
            chain: this.chain,
            address: this.gameAddress,
            abi: index_js_1.AmongUsGameABI,
            functionName: "startGame",
            args: [],
        });
        await this.publicClient.waitForTransactionReceipt({ hash });
        return hash;
    }
    // ============ ACTION COMMIT-REVEAL ============
    generateSalt() {
        const randomBytes = new Uint8Array(32);
        crypto.getRandomValues(randomBytes);
        return `0x${Array.from(randomBytes)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("")}`;
    }
    createActionCommitment(action) {
        const salt = this.generateSalt();
        const hash = (0, viem_1.keccak256)((0, viem_1.encodePacked)(["uint8", "address", "uint8", "uint8", "uint8", "bytes32", "address"], [
            action.type,
            action.target || "0x0000000000000000000000000000000000000000",
            action.destination ?? 0,
            action.taskId ?? 0,
            action.sabotage ?? 0,
            salt,
            this.account.address,
        ]));
        return { hash, action, salt };
    }
    async commitAction(commitment) {
        if (!this.gameAddress)
            throw new Error("No game set");
        const hash = await this.walletClient.writeContract({
            chain: this.chain,
            address: this.gameAddress,
            abi: index_js_1.AmongUsGameABI,
            functionName: "commitAction",
            args: [commitment.hash],
        });
        await this.publicClient.waitForTransactionReceipt({ hash });
        return hash;
    }
    async revealAction(commitment) {
        if (!this.gameAddress)
            throw new Error("No game set");
        const { action, salt } = commitment;
        const hash = await this.walletClient.writeContract({
            chain: this.chain,
            address: this.gameAddress,
            abi: index_js_1.AmongUsGameABI,
            functionName: "revealAction",
            args: [
                action.type,
                action.target || "0x0000000000000000000000000000000000000000",
                action.destination ?? 0,
                action.taskId ?? 0,
                action.sabotage ?? 0,
                salt,
            ],
        });
        await this.publicClient.waitForTransactionReceipt({ hash });
        return hash;
    }
    // ============ VOTING ============
    async submitVote(suspect) {
        if (!this.gameAddress)
            throw new Error("No game set");
        const targetAddress = suspect || "0x0000000000000000000000000000000000000000";
        const hash = await this.walletClient.writeContract({
            chain: this.chain,
            address: this.gameAddress,
            abi: index_js_1.AmongUsGameABI,
            functionName: "submitVote",
            args: [targetAddress],
        });
        await this.publicClient.waitForTransactionReceipt({ hash });
        return hash;
    }
    async submitMessage(msgType, target, reason, location) {
        if (!this.gameAddress)
            throw new Error("No game set");
        const hash = await this.walletClient.writeContract({
            chain: this.chain,
            address: this.gameAddress,
            abi: index_js_1.AmongUsGameABI,
            functionName: "submitMessage",
            args: [msgType, target, reason, location],
        });
        await this.publicClient.waitForTransactionReceipt({ hash });
        return hash;
    }
    // ============ PHASE ADVANCE ============
    async advancePhase() {
        if (!this.gameAddress)
            throw new Error("No game set");
        const hash = await this.walletClient.writeContract({
            chain: this.chain,
            address: this.gameAddress,
            abi: index_js_1.AmongUsGameABI,
            functionName: "advancePhase",
            args: [],
        });
        await this.publicClient.waitForTransactionReceipt({ hash });
        return hash;
    }
    // ============ HELPER ACTIONS ============
    createMoveAction(destination) {
        return {
            type: types_js_1.ActionType.Move,
            destination,
        };
    }
    createDoTaskAction(taskId) {
        return {
            type: types_js_1.ActionType.DoTask,
            taskId,
        };
    }
    createFakeTaskAction() {
        return {
            type: types_js_1.ActionType.FakeTask,
        };
    }
    createKillAction(target) {
        return {
            type: types_js_1.ActionType.Kill,
            target,
        };
    }
    createReportAction() {
        return {
            type: types_js_1.ActionType.Report,
        };
    }
    createCallMeetingAction() {
        return {
            type: types_js_1.ActionType.CallMeeting,
        };
    }
    createVentAction(destination) {
        return {
            type: types_js_1.ActionType.Vent,
            destination,
        };
    }
    createSabotageAction(sabotageType) {
        return {
            type: types_js_1.ActionType.Sabotage,
            sabotage: sabotageType,
        };
    }
    createSkipAction() {
        return {
            type: types_js_1.ActionType.Skip,
        };
    }
}
exports.ActionSubmitter = ActionSubmitter;
//# sourceMappingURL=ActionSubmitter.js.map