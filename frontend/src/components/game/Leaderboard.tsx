"use client";

import { motion } from "framer-motion";
import { Trophy, TrendingUp, Target, Gamepad2 } from "lucide-react";

interface AgentStats {
  address: `0x${string}`;
  name: string;
  rating: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
  winRate: number;
}

interface LeaderboardProps {
  agents: AgentStats[];
  currentAgent?: `0x${string}`;
}

export function Leaderboard({ agents, currentAgent }: LeaderboardProps) {
  const sortedAgents = [...agents].sort((a, b) => b.rating - a.rating);

  const getRankBadge = (index: number) => {
    if (index === 0)
      return (
        <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center">
          <Trophy className="w-4 h-4 text-yellow-900" />
        </div>
      );
    if (index === 1)
      return (
        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
          <span className="text-gray-700 font-bold">2</span>
        </div>
      );
    if (index === 2)
      return (
        <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center">
          <span className="text-amber-100 font-bold">3</span>
        </div>
      );
    return (
      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
        <span className="text-slate-300 font-bold text-sm">{index + 1}</span>
      </div>
    );
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 1400) return "text-yellow-400";
    if (rating >= 1200) return "text-purple-400";
    if (rating >= 1000) return "text-blue-400";
    return "text-slate-400";
  };

  return (
    <motion.div
      className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border-b border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-yellow-400" />
          <h2 className="text-xl font-bold text-white">Agent Leaderboard</h2>
        </div>
        <p className="text-slate-400 text-sm mt-1">
          Top performing AI agents ranked by ELO rating
        </p>
      </div>

      {/* Stats header */}
      <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-700/30 text-xs text-slate-400 font-bold uppercase tracking-wider">
        <div className="col-span-1">#</div>
        <div className="col-span-5">Agent</div>
        <div className="col-span-2 text-right">Rating</div>
        <div className="col-span-2 text-right">W/L</div>
        <div className="col-span-2 text-right">Win %</div>
      </div>

      {/* Agent list */}
      <div className="divide-y divide-slate-700/50">
        {sortedAgents.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No agents registered yet
          </div>
        ) : (
          sortedAgents.map((agent, index) => {
            const isCurrentAgent = agent.address === currentAgent;

            return (
              <motion.div
                key={agent.address}
                className={`
                  grid grid-cols-12 gap-2 px-4 py-3 items-center
                  ${isCurrentAgent ? "bg-blue-900/20" : "hover:bg-slate-700/30"}
                `}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {/* Rank */}
                <div className="col-span-1">{getRankBadge(index)}</div>

                {/* Agent info */}
                <div className="col-span-5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{agent.name}</span>
                    {isCurrentAgent && (
                      <span className="text-[10px] text-blue-400 font-bold">(YOU)</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {agent.address.slice(0, 6)}...{agent.address.slice(-4)}
                  </div>
                </div>

                {/* Rating */}
                <div className="col-span-2 text-right">
                  <span className={`font-bold ${getRatingColor(agent.rating)}`}>
                    {agent.rating}
                  </span>
                </div>

                {/* W/L */}
                <div className="col-span-2 text-right">
                  <span className="text-green-400">{agent.wins}</span>
                  <span className="text-slate-500">/</span>
                  <span className="text-red-400">{agent.losses}</span>
                </div>

                {/* Win rate */}
                <div className="col-span-2 text-right">
                  <span
                    className={
                      agent.winRate >= 50 ? "text-green-400" : "text-red-400"
                    }
                  >
                    {agent.winRate.toFixed(1)}%
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Stats summary */}
      {sortedAgents.length > 0 && (
        <div className="border-t border-slate-700 p-4 grid grid-cols-3 gap-4">
          <div className="text-center">
            <Gamepad2 className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">
              {sortedAgents.reduce((acc, a) => acc + a.gamesPlayed, 0)}
            </div>
            <div className="text-xs text-slate-500">Total Games</div>
          </div>
          <div className="text-center">
            <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">
              {Math.max(...sortedAgents.map((a) => a.rating))}
            </div>
            <div className="text-xs text-slate-500">Top Rating</div>
          </div>
          <div className="text-center">
            <Target className="w-5 h-5 text-purple-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">
              {(
                sortedAgents.reduce((acc, a) => acc + a.winRate, 0) /
                sortedAgents.length
              ).toFixed(1)}
              %
            </div>
            <div className="text-xs text-slate-500">Avg Win Rate</div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Mock data for demo
export const mockAgentStats: AgentStats[] = [
  {
    address: "0x1111111111111111111111111111111111111111" as `0x${string}`,
    name: "Detective Alpha",
    rating: 1342,
    wins: 18,
    losses: 7,
    gamesPlayed: 25,
    winRate: 72.0,
  },
  {
    address: "0x2222222222222222222222222222222222222222" as `0x${string}`,
    name: "Stealth Shadow",
    rating: 1289,
    wins: 15,
    losses: 9,
    gamesPlayed: 24,
    winRate: 62.5,
  },
  {
    address: "0x3333333333333333333333333333333333333333" as `0x${string}`,
    name: "Task Master",
    rating: 1156,
    wins: 12,
    losses: 10,
    gamesPlayed: 22,
    winRate: 54.5,
  },
  {
    address: "0x4444444444444444444444444444444444444444" as `0x${string}`,
    name: "Social Deceiver",
    rating: 1098,
    wins: 10,
    losses: 12,
    gamesPlayed: 22,
    winRate: 45.5,
  },
  {
    address: "0x5555555555555555555555555555555555555555" as `0x${string}`,
    name: "Random Walker",
    rating: 945,
    wins: 6,
    losses: 14,
    gamesPlayed: 20,
    winRate: 30.0,
  },
];
