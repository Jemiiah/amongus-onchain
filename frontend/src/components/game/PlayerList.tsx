"use client";

import { motion } from "framer-motion";
import { Player, PlayerColors, Role, LocationNames } from "@/types/game";
import { PlayerSprite } from "./PlayerSprite";
import { MapPin, CheckCircle, Ghost } from "lucide-react";

interface PlayerListProps {
  players: Player[];
  currentPlayer?: `0x${string}`;
  showRoles?: boolean;
  showLocations?: boolean;
}

export function PlayerList({
  players,
  currentPlayer,
  showRoles = false,
  showLocations = false,
}: PlayerListProps) {
  const sortedPlayers = [...players].sort((a, b) => {
    // Current player first
    if (a.address === currentPlayer) return -1;
    if (b.address === currentPlayer) return 1;
    // Then alive players
    if (a.isAlive && !b.isAlive) return -1;
    if (!a.isAlive && b.isAlive) return 1;
    return 0;
  });

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case Role.Impostor:
        return (
          <span className="text-[10px] px-1.5 py-0.5 bg-red-600 text-white rounded-full font-bold">
            IMP
          </span>
        );
      case Role.Crewmate:
        return (
          <span className="text-[10px] px-1.5 py-0.5 bg-blue-600 text-white rounded-full font-bold">
            CREW
          </span>
        );
      case Role.Ghost:
        return (
          <span className="text-[10px] px-1.5 py-0.5 bg-gray-600 text-white rounded-full font-bold">
            GHOST
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      {/* Header */}
      <div className="bg-slate-700/50 px-4 py-2 border-b border-slate-600">
        <h3 className="text-white font-bold">
          Players ({players.filter((p) => p.isAlive).length}/{players.length})
        </h3>
      </div>

      {/* Player list */}
      <div className="divide-y divide-slate-700/50">
        {sortedPlayers.map((player, index) => {
          const color = PlayerColors[player.colorId];
          const isCurrentPlayer = player.address === currentPlayer;

          return (
            <motion.div
              key={player.address}
              className={`
                p-3 flex items-center gap-3 transition-colors
                ${isCurrentPlayer ? "bg-blue-900/20" : "hover:bg-slate-700/30"}
                ${!player.isAlive ? "opacity-50" : ""}
              `}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: player.isAlive ? 1 : 0.5, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* Player sprite */}
              <PlayerSprite
                colorId={player.colorId}
                isAlive={player.isAlive}
                isGhost={player.role === Role.Ghost}
                size="sm"
              />

              {/* Player info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="font-bold text-sm truncate"
                    style={{ color: color.light }}
                  >
                    {color.name}
                  </span>
                  {isCurrentPlayer && (
                    <span className="text-[10px] text-blue-400 font-bold">(YOU)</span>
                  )}
                  {showRoles && getRoleBadge(player.role)}
                </div>

                {/* Address */}
                <div className="text-xs text-slate-500 truncate">
                  {player.address.slice(0, 6)}...{player.address.slice(-4)}
                </div>

                {/* Location */}
                {showLocations && player.isAlive && (
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-400">
                      {LocationNames[player.location]}
                    </span>
                  </div>
                )}
              </div>

              {/* Status indicators */}
              <div className="flex flex-col items-end gap-1">
                {/* Task progress */}
                {player.isAlive && (
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-slate-400">
                      {player.tasksCompleted}/{player.totalTasks}
                    </span>
                  </div>
                )}

                {/* Ghost indicator */}
                {!player.isAlive && (
                  <Ghost className="w-4 h-4 text-slate-500" />
                )}

                {/* Vote status */}
                {player.hasVoted && (
                  <span className="text-[10px] text-green-400">voted</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
