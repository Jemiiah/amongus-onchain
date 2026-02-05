"use client";

import { motion } from "framer-motion";
import {
  GameState,
  GamePhase,
  PhaseNames,
  SabotageType,
  Player,
  PlayerColors,
} from "@/types/game";
import { PlayerSprite } from "./PlayerSprite";
import { Clock, Users, Skull, CheckCircle, AlertTriangle } from "lucide-react";

interface GameHeaderProps {
  gameState: GameState;
  players: Player[];
  currentPlayer?: Player;
}

export function GameHeader({ gameState, players, currentPlayer }: GameHeaderProps) {
  const phaseColors: Record<GamePhase, string> = {
    [GamePhase.Lobby]: "bg-slate-600",
    [GamePhase.Starting]: "bg-yellow-600",
    [GamePhase.ActionCommit]: "bg-blue-600",
    [GamePhase.ActionReveal]: "bg-purple-600",
    [GamePhase.Discussion]: "bg-orange-600",
    [GamePhase.Voting]: "bg-red-600",
    [GamePhase.VoteResult]: "bg-pink-600",
    [GamePhase.Ended]: "bg-green-600",
  };

  const sabotageNames: Record<SabotageType, string> = {
    [SabotageType.None]: "",
    [SabotageType.Lights]: "Lights Sabotaged!",
    [SabotageType.Reactor]: "Reactor Meltdown!",
    [SabotageType.O2]: "O2 Depleting!",
    [SabotageType.Comms]: "Comms Sabotaged!",
  };

  const getTimeRemaining = () => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const remaining = gameState.phaseEndTime - now;
    return remaining > 0n ? Number(remaining) : 0;
  };

  const taskProgress =
    gameState.totalTasksRequired > 0
      ? (gameState.totalTasksCompleted / gameState.totalTasksRequired) * 100
      : 0;

  return (
    <motion.div
      className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Top bar - Phase and Timer */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        {/* Phase indicator */}
        <div className="flex items-center gap-3">
          <motion.div
            className={`px-4 py-1.5 rounded-full ${phaseColors[gameState.phase]} text-white font-bold text-sm`}
            key={gameState.phase}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            {PhaseNames[gameState.phase]}
          </motion.div>

          <div className="text-slate-400 text-sm">
            Round {gameState.round.toString()}
          </div>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <motion.span
            className="text-white font-mono text-lg"
            key={getTimeRemaining()}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
          >
            {getTimeRemaining()}s
          </motion.span>
        </div>
      </div>

      {/* Sabotage alert */}
      {gameState.activeSabotage !== SabotageType.None && (
        <motion.div
          className="bg-red-900/50 border-b border-red-700 px-3 py-2 flex items-center gap-2"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
        >
          <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
          <span className="text-red-300 font-bold">
            {sabotageNames[gameState.activeSabotage]}
          </span>
        </motion.div>
      )}

      {/* Stats bar */}
      <div className="flex items-center justify-between p-3 gap-4">
        {/* Players alive */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-green-400" />
            <span className="text-slate-300 text-sm">
              <span className="text-green-400 font-bold">{gameState.alivePlayers}</span> alive
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Skull className="w-4 h-4 text-red-400" />
            <span className="text-slate-300 text-sm">
              <span className="text-red-400 font-bold">
                {players.length - gameState.alivePlayers}
              </span>{" "}
              dead
            </span>
          </div>
        </div>

        {/* Task progress */}
        <div className="flex-1 max-w-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-green-500"
                initial={{ width: 0 }}
                animate={{ width: `${taskProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-xs text-slate-400">
              {gameState.totalTasksCompleted}/{gameState.totalTasksRequired}
            </span>
          </div>
        </div>
      </div>

      {/* Current player info */}
      {currentPlayer && (
        <div className="border-t border-slate-700 p-3 flex items-center gap-3 bg-slate-700/30">
          <PlayerSprite
            colorId={currentPlayer.colorId}
            isAlive={currentPlayer.isAlive}
            size="sm"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span
                className="font-bold"
                style={{ color: PlayerColors[currentPlayer.colorId].light }}
              >
                {PlayerColors[currentPlayer.colorId].name}
              </span>
              <span className="text-xs text-slate-500">
                {currentPlayer.address.slice(0, 6)}...{currentPlayer.address.slice(-4)}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Tasks: {currentPlayer.tasksCompleted}/{currentPlayer.totalTasks}
            </div>
          </div>
          {!currentPlayer.isAlive && (
            <span className="text-red-400 text-xs font-bold">DEAD</span>
          )}
        </div>
      )}
    </motion.div>
  );
}
