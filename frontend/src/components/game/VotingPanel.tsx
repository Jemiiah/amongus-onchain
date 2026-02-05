"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Player, PlayerColors } from "@/types/game";
import { PlayerSprite } from "./PlayerSprite";

interface VotingPanelProps {
  players: Player[];
  currentPlayer?: `0x${string}`;
  onVote?: (target: `0x${string}` | null) => void;
  votingResults?: Map<`0x${string}`, number>;
  isVotingPhase: boolean;
  hasVoted?: boolean;
  timeRemaining?: number;
}

export function VotingPanel({
  players,
  currentPlayer,
  onVote,
  votingResults,
  isVotingPhase,
  hasVoted = false,
  timeRemaining,
}: VotingPanelProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<`0x${string}` | null>(null);

  const alivePlayers = players.filter((p) => p.isAlive);

  const handleVote = () => {
    if (onVote && !hasVoted) {
      onVote(selectedPlayer);
    }
  };

  const getVoteCount = (address: `0x${string}`) => {
    return votingResults?.get(address) || 0;
  };

  const skipVotes = votingResults
    ? Array.from(votingResults.entries()).reduce((acc, [addr, count]) => {
        if (addr === "0x0000000000000000000000000000000000000000") {
          return count;
        }
        return acc;
      }, 0)
    : 0;

  return (
    <motion.div
      className="bg-slate-800 rounded-xl p-4 border border-slate-700"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">
          {isVotingPhase ? "Vote for the Impostor" : "Discussion Phase"}
        </h2>
        {timeRemaining !== undefined && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">{timeRemaining}</span>
            </div>
          </div>
        )}
      </div>

      {/* Player voting cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <AnimatePresence>
          {alivePlayers.map((player) => {
            const color = PlayerColors[player.colorId];
            const isSelected = selectedPlayer === player.address;
            const voteCount = getVoteCount(player.address);
            const isCurrentPlayer = player.address === currentPlayer;

            return (
              <motion.button
                key={player.address}
                className={`
                  relative p-3 rounded-lg border-2 transition-all
                  ${isSelected ? "border-yellow-400 bg-yellow-400/10" : "border-slate-600 bg-slate-700/50"}
                  ${hasVoted ? "opacity-50 cursor-not-allowed" : "hover:border-slate-400 cursor-pointer"}
                  ${isCurrentPlayer ? "ring-2 ring-blue-400" : ""}
                `}
                onClick={() => !hasVoted && setSelectedPlayer(player.address)}
                disabled={hasVoted}
                whileHover={!hasVoted ? { scale: 1.02 } : {}}
                whileTap={!hasVoted ? { scale: 0.98 } : {}}
                layout
              >
                <div className="flex items-center gap-2">
                  <PlayerSprite
                    colorId={player.colorId}
                    isAlive={true}
                    size="sm"
                  />
                  <div className="flex-1 text-left">
                    <div
                      className="font-bold text-sm truncate"
                      style={{ color: color.light }}
                    >
                      {color.name}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {player.address.slice(0, 6)}...{player.address.slice(-4)}
                    </div>
                  </div>
                </div>

                {/* Vote count badge */}
                {voteCount > 0 && (
                  <motion.div
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    <span className="text-white text-xs font-bold">{voteCount}</span>
                  </motion.div>
                )}

                {/* Current player indicator */}
                {isCurrentPlayer && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                    <span className="text-[10px] text-blue-400 font-bold">YOU</span>
                  </div>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>

        {/* Skip vote option */}
        <motion.button
          className={`
            relative p-3 rounded-lg border-2 transition-all
            ${selectedPlayer === null && hasVoted ? "border-gray-400 bg-gray-400/10" : "border-slate-600 bg-slate-700/50"}
            ${hasVoted ? "opacity-50 cursor-not-allowed" : "hover:border-slate-400 cursor-pointer"}
          `}
          onClick={() => !hasVoted && setSelectedPlayer(null)}
          disabled={hasVoted}
          whileHover={!hasVoted ? { scale: 1.02 } : {}}
          whileTap={!hasVoted ? { scale: 0.98 } : {}}
        >
          <div className="flex items-center justify-center gap-2 h-full">
            <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
              <span className="text-slate-300 text-lg">?</span>
            </div>
            <span className="text-slate-300 font-bold">Skip Vote</span>
          </div>

          {skipVotes > 0 && (
            <motion.div
              className="absolute -top-2 -right-2 w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              <span className="text-white text-xs font-bold">{skipVotes}</span>
            </motion.div>
          )}
        </motion.button>
      </div>

      {/* Vote button */}
      {isVotingPhase && (
        <motion.button
          className={`
            w-full py-3 rounded-lg font-bold text-white transition-all
            ${hasVoted ? "bg-slate-600 cursor-not-allowed" : "bg-red-600 hover:bg-red-500"}
          `}
          onClick={handleVote}
          disabled={hasVoted}
          whileHover={!hasVoted ? { scale: 1.01 } : {}}
          whileTap={!hasVoted ? { scale: 0.99 } : {}}
        >
          {hasVoted ? "Vote Submitted" : "Confirm Vote"}
        </motion.button>
      )}
    </motion.div>
  );
}
