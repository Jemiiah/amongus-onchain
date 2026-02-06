"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Agent,
  GameRoom,
  RoomStatus,
  RoomStatusNames,
  PlayerColors,
} from "@/types/game";
import { AmongUsSprite } from "./AmongUsSprite";

interface LobbyScreenProps {
  agents: Agent[];
  rooms: GameRoom[];
  roomCreator: `0x${string}` | null;
  onGameStart: (roomId: number) => void;
  onBack: () => void;
}

export function LobbyScreen({
  agents,
  rooms,
  roomCreator,
  onGameStart,
  onBack,
}: LobbyScreenProps) {
  const [activityLog, setActivityLog] = useState<string[]>([
    "Agents initializing...",
  ]);

  const openRooms = rooms.filter((r) => r.status === RoomStatus.Open || r.status === RoomStatus.Full);
  const activeRoom = rooms.find(r => r.status === RoomStatus.Open || r.status === RoomStatus.Full);

  // Add activity log entries
  const addLog = (message: string) => {
    setActivityLog(prev => [...prev.slice(-9), message]);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-purple-900/20 to-slate-900 overflow-hidden">
      {/* Animated stars background */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 1, 0.2],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <motion.div
        className="relative z-10 pt-8 pb-4 px-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back</span>
          </button>

          <div className="text-center">
            <h1 className="text-4xl font-bold text-white tracking-wider">
              AGENT <span className="text-cyan-400">LOBBY</span>
            </h1>
            <p className="text-gray-400 text-sm mt-1">Spectator Mode - Watching agents operate</p>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-4 py-2 border border-slate-700">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-400 text-sm">Live</span>
          </div>
        </div>
      </motion.div>

      <div className="relative z-10 px-8 pb-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Registered Agents */}
          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <AgentsPanel
              agents={agents}
              roomCreator={roomCreator}
            />
          </motion.div>

          {/* Middle Panel - Active Room */}
          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {activeRoom ? (
              <ActiveRoomPanel
                room={activeRoom}
                onWatch={() => onGameStart(activeRoom.roomId)}
              />
            ) : (
              <WaitingForRoomPanel roomCreator={roomCreator} agents={agents} />
            )}
          </motion.div>

          {/* Right Panel - Activity Log */}
          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <ActivityLogPanel logs={activityLog} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// Sub-components

function AgentsPanel({
  agents,
  roomCreator,
}: {
  agents: Agent[];
  roomCreator: `0x${string}` | null;
}) {
  // Sort agents by balance (highest first)
  const sortedAgents = [...agents].sort((a, b) =>
    Number(b.balance - a.balance)
  );

  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden h-full">
      <div className="px-6 py-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Registered Agents</h2>
          <span className="text-sm text-gray-400">{agents.length} agents</span>
        </div>
      </div>

      <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
        {sortedAgents.map((agent, index) => {
          const isCreator = agent.address === roomCreator;
          return (
            <motion.div
              key={agent.address}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-3 rounded-xl flex items-center gap-3 ${
                isCreator
                  ? "bg-yellow-500/10 border border-yellow-500/30"
                  : "bg-slate-700/30 border border-slate-600/50"
              }`}
            >
              <div className="w-10 h-10 flex-shrink-0">
                <AmongUsSprite colorId={agent.colorId} scale={1} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium truncate">
                    {agent.name}
                  </span>
                  {isCreator && (
                    <span className="text-yellow-500 text-xs">👑 Host</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-cyan-400">
                    {formatBalance(agent.balance)} MON
                  </span>
                  <span className="text-gray-500">
                    {agent.wins}W / {agent.gamesPlayed}G
                  </span>
                </div>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function ActiveRoomPanel({
  room,
  onWatch,
}: {
  room: GameRoom;
  onWatch: () => void;
}) {
  const MIN_PLAYERS = 6;
  const canStart = room.players.length >= MIN_PLAYERS;
  const [countdown, setCountdown] = useState(canStart ? 5 : 0);

  // Auto-countdown when room has enough players
  useEffect(() => {
    if (canStart && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (canStart && countdown === 0) {
      onWatch();
    }
  }, [canStart, countdown, onWatch]);

  return (
    <div className="bg-slate-800/50 rounded-2xl border border-cyan-500/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700 bg-cyan-500/10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Active Game Room</h2>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            Room #{room.roomId}
          </span>
        </div>
      </div>

      <div className="p-6">
        {/* Wager Info */}
        <div className="mb-6 p-4 bg-slate-900/50 rounded-xl text-center">
          <div className="text-sm text-gray-400 mb-1">Wager Pool</div>
          <div className="text-3xl font-bold text-yellow-400">
            {formatBalance(room.wagerAmount * BigInt(room.players.length))} MON
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {formatBalance(room.wagerAmount)} MON per agent
          </div>
        </div>

        {/* Players Grid */}
        <div className="mb-6">
          <div className="text-sm text-gray-400 mb-3 text-center">
            Agents Joined ({room.players.length}/{room.maxPlayers})
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: room.maxPlayers }).map((_, i) => {
              const player = room.players[i];
              return (
                <motion.div
                  key={i}
                  initial={player ? { scale: 0 } : {}}
                  animate={player ? { scale: 1 } : {}}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center ${
                    player
                      ? "bg-slate-700/50 border border-slate-600"
                      : "bg-slate-900/30 border border-dashed border-slate-700"
                  }`}
                >
                  {player ? (
                    <>
                      <div className="w-10 h-10 mb-1">
                        <AmongUsSprite colorId={player.colorId} scale={1} />
                      </div>
                      <div className="text-xs text-gray-400 truncate max-w-full px-2">
                        {player.address === room.creator && (
                          <span className="text-yellow-500">👑 </span>
                        )}
                        {player.name.split(" ")[1]}
                      </div>
                    </>
                  ) : (
                    <motion.div
                      className="text-gray-600 text-2xl"
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      ?
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Status */}
        <div className="text-center">
          {canStart ? (
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="p-4 bg-green-500/20 rounded-xl border border-green-500/30"
            >
              <div className="text-green-400 font-bold text-lg mb-1">
                Game Starting...
              </div>
              <div className="text-4xl font-bold text-white">
                {countdown}
              </div>
            </motion.div>
          ) : (
            <div className="p-4 bg-slate-900/50 rounded-xl">
              <div className="text-gray-400">
                Waiting for {MIN_PLAYERS - room.players.length} more agent{MIN_PLAYERS - room.players.length !== 1 ? "s" : ""}...
              </div>
              <motion.div
                className="flex justify-center gap-1 mt-2"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <div className="w-2 h-2 bg-cyan-500 rounded-full" />
                <div className="w-2 h-2 bg-cyan-500 rounded-full" />
                <div className="w-2 h-2 bg-cyan-500 rounded-full" />
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WaitingForRoomPanel({
  roomCreator,
  agents,
}: {
  roomCreator: `0x${string}` | null;
  agents: Agent[];
}) {
  const creatorAgent = agents.find(a => a.address === roomCreator);

  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700">
        <h2 className="text-xl font-bold text-white">Game Room</h2>
      </div>

      <div className="p-6">
        <div className="text-center py-8">
          <motion.div
            className="text-6xl mb-4"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🚀
          </motion.div>
          <p className="text-gray-400 mb-2">Waiting for room creation...</p>
          {creatorAgent && (
            <div className="mt-4 p-4 bg-slate-900/50 rounded-xl">
              <div className="text-xs text-gray-500 mb-2">Room Creator</div>
              <div className="flex items-center justify-center gap-3">
                <div className="w-8 h-8">
                  <AmongUsSprite colorId={creatorAgent.colorId} scale={0.8} />
                </div>
                <div>
                  <div className="text-white font-medium">{creatorAgent.name}</div>
                  <div className="text-xs text-cyan-400">
                    {formatBalance(creatorAgent.balance)} MON
                  </div>
                </div>
              </div>
              <motion.p
                className="text-xs text-gray-500 mt-3"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Highest balance - will create room automatically
              </motion.p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityLogPanel({ logs }: { logs: string[] }) {
  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden h-full">
      <div className="px-6 py-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Activity Log</h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-400">Live</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto font-mono text-sm">
        <AnimatePresence>
          {logs.map((log, index) => (
            <motion.div
              key={`${index}-${log}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-2"
            >
              <span className="text-gray-600 flex-shrink-0">
                {new Date().toLocaleTimeString().slice(0, 5)}
              </span>
              <span className="text-gray-300">{log}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Utility functions

function formatBalance(balance: bigint): string {
  const eth = Number(balance) / 1e18;
  return eth.toFixed(2);
}
