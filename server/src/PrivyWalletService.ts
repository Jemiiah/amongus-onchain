import { PrivyClient } from "@privy-io/node";
import { createLogger } from "./logger.js";
import { databaseService } from "./DatabaseService.js";

const logger = createLogger("privy-wallet");

// Privy configuration from environment
const PRIVY_APP_ID = process.env.PRIVY_APP_ID || "";
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET || "";

interface AgentWallet {
  userId: string;       // Privy user ID
  address: string;      // Wallet address
  walletId: string;     // Privy wallet ID
  operatorKey: string;  // Operator key that owns this agent
  createdAt: number;
}

/**
 * Service for creating and managing agent wallets via Privy
 */
export class PrivyWalletService {
  private client: PrivyClient | null = null;

  constructor() {
    if (PRIVY_APP_ID && PRIVY_APP_SECRET &&
      PRIVY_APP_ID !== "your-privy-app-id-here" &&
      PRIVY_APP_SECRET !== "your-privy-app-secret-here") {
      this.client = new PrivyClient({
        appId: PRIVY_APP_ID,
        appSecret: PRIVY_APP_SECRET,
      });
      logger.info("Privy wallet service initialized");
    } else {
      logger.warn("Privy not configured - wallet creation disabled. Set PRIVY_APP_ID and PRIVY_APP_SECRET in .env");
    }
  }

  /**
   * Check if Privy is enabled
   */
  isEnabled(): boolean {
    return this.client !== null;
  }

  /**
   * Create a new agent wallet for an operator
   * @param operatorKey The operator key (oper_XXXXX)
   * @returns The wallet address or null if failed
   */
  async createAgentWallet(operatorKey: string): Promise<{ address: string; userId: string } | null> {
    if (!this.client) {
      logger.error("Cannot create wallet: Privy not configured");
      return null;
    }

    try {
      // Create a new Privy user for this agent
      // Using a custom identifier based on operator key
      const customId = `agent_${operatorKey}_${Date.now()}`;

      // Create user with custom auth and an Ethereum wallet
      const user = await this.client.users().create({
        linked_accounts: [
          {
            type: "custom_auth",
            custom_user_id: customId,
          },
        ],
        wallets: [
          {
            chain_type: "ethereum",
          },
        ],
      });

      // Find the Ethereum embedded wallet in linked accounts
      // The wallet type for embedded wallets is "ethereum_embedded_wallet"
      let walletAddress: string | undefined;
      let walletId: string | undefined;

      for (const account of user.linked_accounts) {
        if (account.type === "wallet" && "address" in account && account.chain_type === "ethereum") {
          walletAddress = (account as any).address;
          walletId = (account as any).id;
          break;
        }
      }

      if (!walletAddress || !walletId) {
        logger.error("No Ethereum wallet created for agent");
        return null;
      }

      const address = walletAddress.toLowerCase();

      // Persist to database
      // First get the operator ID if possible
      const operator = await databaseService.getOperatorByKey(operatorKey);
      if (operator) {
        databaseService.upsertAgent({
          walletAddress: address,
          name: `Agent ${address.substring(0, 6)}`,
          operatorId: operator.id,
          privyUserId: user.id,
          privyWalletId: walletId,
        });
      } else {
        logger.warn(`Operator ${operatorKey} not found in DB - agent wallet persisted in memory only`);
      }

      logger.info(`Created agent wallet: ${address} (ID: ${walletId}) for operator: ${operatorKey}`);

      return {
        address,
        userId: user.id,
      };
    } catch (error) {
      logger.error("Failed to create agent wallet:", error);
      return null;
    }
  }

  /**
   * Get agent wallet info by address from database
   */
  async getAgentWallet(address: string): Promise<AgentWallet | undefined> {
    const agent = await databaseService.getAgentByWallet(address) as any;
    if (!agent || !agent.privyUserId || !agent.privyWalletId) {
      return undefined;
    }

    return {
      userId: agent.privyUserId,
      address: agent.walletAddress,
      walletId: agent.privyWalletId,
      operatorKey: agent.operator?.operatorKey || "unknown",
      createdAt: agent.createdAt.getTime(),
    };
  }

  /**
   * Check if an address is a known agent wallet
   */
  async isAgentWallet(address: string): Promise<boolean> {
    const wallet = await this.getAgentWallet(address);
    return !!wallet;
  }

  /**
   * Get all agent wallets for an operator from database
   */
  async getAgentWalletsForOperator(operatorKey: string): Promise<AgentWallet[]> {
    const operator = await databaseService.getOperatorByKey(operatorKey);
    if (!operator) return [];

    return (operator.agents as any[])
      .filter(agent => agent.privyUserId && agent.privyWalletId)
      .map(agent => ({
        userId: agent.privyUserId!,
        address: agent.walletAddress,
        walletId: agent.privyWalletId!,
        operatorKey: operatorKey,
        createdAt: agent.createdAt.getTime(),
      }));
  }

  /**
   * Verify that an operator key owns a specific agent wallet
   */
  async verifyOperatorOwnership(operatorKey: string, agentAddress: string): Promise<boolean> {
    const wallet = await this.getAgentWallet(agentAddress);
    return wallet?.operatorKey === operatorKey;
  }

  /**
   * Send a transaction from an agent wallet (requires Privy to be configured)
   */
  async sendTransaction(address: string, to: string, data: string, value: string = "0"): Promise<string | null> {
    if (!this.client) {
      logger.error("Cannot send transaction: Privy not configured");
      return null;
    }

    const wallet = await this.getAgentWallet(address);
    if (!wallet) {
      logger.error(`No agent wallet found for address: ${address}`);
      return null;
    }

    // Mock bypass for testing with dummy IDs
    if (wallet.userId.startsWith("mock") || wallet.walletId.startsWith("mock")) {
      logger.info(`Mocking transaction for test wallet ${address}`);
      return `0x_mock_tx_${Date.now()}`;
    }
    try {
      logger.info(`Sending transaction from agent ${address} to ${to}`);

      const chainId = parseInt(process.env.CHAIN_ID || "10143");

      // Correct API for server-side signing in @privy-io/node
      const response = await this.client.wallets().ethereum().sendTransaction(wallet.walletId, {
        caip2: `eip155:${chainId}`,
        params: {
          transaction: {
            to,
            value: value.startsWith("0x") ? value : `0x${BigInt(value).toString(16)}`,
            data,
            chain_id: chainId,
          }
        }
      });

      const hash = response.hash;
      logger.info(`Transaction sent! Hash: ${hash}`);
      return hash;
    } catch (error) {
      logger.error(`Failed to send transaction from agent ${address}:`, error);
      return null;
    }
  }
}

// Singleton instance
export const privyWalletService = new PrivyWalletService();
