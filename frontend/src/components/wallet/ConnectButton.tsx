"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { motion } from "framer-motion";
import { usePrivyEnabled } from "@/components/layout/Providers";

export function ConnectButton() {
  const privyEnabled = usePrivyEnabled();

  if (privyEnabled) {
    return <PrivyConnectButton />;
  }

  return <WagmiConnectButton />;
}

function PrivyConnectButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Get the wallet address from Privy user
  const walletAddress = user?.wallet?.address;

  if (!ready) {
    return (
      <div className="px-4 py-2 bg-gray-600/80 rounded-lg border border-gray-400 text-white font-bold">
        Loading...
      </div>
    );
  }

  if (authenticated && walletAddress) {
    return (
      <div className="flex items-center gap-2">
        <div className="px-3 py-2 bg-green-600/80 rounded-lg border border-green-400">
          <span className="text-white font-mono text-sm">
            {truncateAddress(walletAddress)}
          </span>
        </div>
        <motion.button
          className="px-3 py-2 bg-red-600/80 rounded-lg border border-red-400 text-white text-sm font-bold hover:bg-red-500/80 transition-colors"
          onClick={() => logout()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Disconnect
        </motion.button>
      </div>
    );
  }

  return (
    <motion.button
      className="px-4 py-2 bg-blue-600/80 rounded-lg border border-blue-400 text-white font-bold hover:bg-blue-500/80 transition-colors"
      onClick={login}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      Connect Wallet
    </motion.button>
  );
}

function WagmiConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="px-3 py-2 bg-green-600/80 rounded-lg border border-green-400">
          <span className="text-white font-mono text-sm">
            {truncateAddress(address)}
          </span>
        </div>
        <motion.button
          className="px-3 py-2 bg-red-600/80 rounded-lg border border-red-400 text-white text-sm font-bold hover:bg-red-500/80 transition-colors"
          onClick={() => disconnect()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Disconnect
        </motion.button>
      </div>
    );
  }

  return (
    <motion.button
      className="px-4 py-2 bg-blue-600/80 rounded-lg border border-blue-400 text-white font-bold hover:bg-blue-500/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={() => {
        const injectedConnector = connectors.find((c) => c.id === "injected");
        if (injectedConnector) {
          connect({ connector: injectedConnector });
        }
      }}
      disabled={isPending}
      whileHover={!isPending ? { scale: 1.05 } : {}}
      whileTap={!isPending ? { scale: 0.95 } : {}}
    >
      {isPending ? "Connecting..." : "Connect Wallet"}
    </motion.button>
  );
}
