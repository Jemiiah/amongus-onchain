"use client";

import { motion } from "framer-motion";
import { Player, PlayerColors, Role } from "@/types/game";
import { PlayerSprite } from "./PlayerSprite";
import { Trophy, Skull, Coins } from "lucide-react";
import { formatEther } from "viem";

interface GameEndScreenProps {
  crewmatesWon: boolean;
  players: Player[];
  prizePool: bigint;
  onPlayAgain?: () => void;
  onLeave?: () => void;
}

export function GameEndScreen({
  crewmatesWon,
  players,
  prizePool,
  onPlayAgain,
  onLeave,
}: GameEndScreenProps) {
  const winners = players.filter((p) => {
    if (crewmatesWon) {
      return p.role === Role.Crewmate;
    } else {
      return p.role === Role.Impostor;
    }
  });

  const losers = players.filter((p) => {
    if (crewmatesWon) {
      return p.role === Role.Impostor;
    } else {
      return p.role === Role.Crewmate;
    }
  });

  const prizePerWinner = winners.length > 0 ? prizePool / BigInt(winners.length) : 0n;

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden max-w-lg w-full mx-4"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 20 }}
      >
        {/* Header */}
        <div
          className={`p-6 text-center ${
            crewmatesWon
              ? "bg-gradient-to-r from-blue-600 to-cyan-600"
              : "bg-gradient-to-r from-red-600 to-pink-600"
          }`}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            {crewmatesWon ? (
              <Trophy className="w-16 h-16 mx-auto text-yellow-300 mb-2" />
            ) : (
              <Skull className="w-16 h-16 mx-auto text-white mb-2" />
            )}
          </motion.div>

          <motion.h1
            className="text-3xl font-bold text-white"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {crewmatesWon ? "Crewmates Win!" : "Impostors Win!"}
          </motion.h1>

          <motion.p
            className="text-white/80 mt-2"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {crewmatesWon
              ? "All impostors have been ejected!"
              : "The impostors have eliminated the crew!"}
          </motion.p>
        </div>

        {/* Winners section */}
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-green-400 font-bold text-sm uppercase tracking-wider mb-3">
            Winners
          </h3>
          <div className="flex flex-wrap gap-3 justify-center">
            {winners.map((player, i) => (
              <motion.div
                key={player.address}
                className="flex flex-col items-center"
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              >
                <PlayerSprite
                  colorId={player.colorId}
                  isAlive={true}
                  size="md"
                />
                <span
                  className="text-xs font-bold mt-1"
                  style={{ color: PlayerColors[player.colorId].light }}
                >
                  {PlayerColors[player.colorId].name}
                </span>
                <span className="text-[10px] text-green-400">
                  +{formatEther(prizePerWinner)} MON
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Losers section */}
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-red-400 font-bold text-sm uppercase tracking-wider mb-3">
            Defeated
          </h3>
          <div className="flex flex-wrap gap-3 justify-center opacity-60">
            {losers.map((player, i) => (
              <motion.div
                key={player.address}
                className="flex flex-col items-center"
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
              >
                <PlayerSprite
                  colorId={player.colorId}
                  isAlive={false}
                  size="md"
                />
                <span
                  className="text-xs font-bold mt-1"
                  style={{ color: PlayerColors[player.colorId].light }}
                >
                  {PlayerColors[player.colorId].name}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Prize pool */}
        <div className="p-4 bg-slate-700/30">
          <div className="flex items-center justify-center gap-2 text-yellow-400">
            <Coins className="w-5 h-5" />
            <span className="font-bold">Prize Pool: {formatEther(prizePool)} MON</span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 flex gap-3">
          <motion.button
            className="flex-1 py-3 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold"
            onClick={onPlayAgain}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Play Again
          </motion.button>
          <motion.button
            className="py-3 px-6 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold"
            onClick={onLeave}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Leave
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
