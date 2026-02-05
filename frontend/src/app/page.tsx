"use client";

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import {
  MainMenu,
  SpaceBackground,
  ScrollableMap,
  TaskBar,
  ActionButtons,
  VotingScreen,
  DeadBodyReportedScreen,
  AmongUsGameEndScreen,
  EjectionScreen,
  AmongUsSprite,
  GameLogPanel,
} from "@/components/game";
import {
  Player,
  GamePhase,
  GameLog,
  DeadBody,
  Location,
  LocationNames,
  Role,
  PlayerColors,
} from "@/types/game";

// Mock data for demonstration - players distributed across different rooms
const mockPlayers: Player[] = [
  {
    address: "0x1234567890123456789012345678901234567890" as `0x${string}`,
    colorId: 0, // Red
    role: Role.Crewmate,
    location: Location.Cafeteria,
    isAlive: true,
    tasksCompleted: 2,
    totalTasks: 5,
    hasVoted: false,
  },
  {
    address: "0x2345678901234567890123456789012345678901" as `0x${string}`,
    colorId: 1, // Blue
    role: Role.Impostor,
    location: Location.Electrical,
    isAlive: true,
    tasksCompleted: 1,
    totalTasks: 5,
    hasVoted: true,
  },
  {
    address: "0x3456789012345678901234567890123456789012" as `0x${string}`,
    colorId: 2, // Green
    role: Role.Crewmate,
    location: Location.MedBay,
    isAlive: true,
    tasksCompleted: 3,
    totalTasks: 5,
    hasVoted: false,
  },
  {
    address: "0x4567890123456789012345678901234567890123" as `0x${string}`,
    colorId: 3, // Pink
    role: Role.Crewmate,
    location: Location.Electrical,
    isAlive: false,
    tasksCompleted: 1,
    totalTasks: 5,
    hasVoted: false,
  },
  {
    address: "0x5678901234567890123456789012345678901234" as `0x${string}`,
    colorId: 4, // Orange
    role: Role.Crewmate,
    location: Location.Security,
    isAlive: true,
    tasksCompleted: 4,
    totalTasks: 5,
    hasVoted: false,
  },
  {
    address: "0x6789012345678901234567890123456789012345" as `0x${string}`,
    colorId: 8, // Purple
    role: Role.Crewmate,
    location: Location.Admin,
    isAlive: true,
    tasksCompleted: 2,
    totalTasks: 5,
    hasVoted: false,
  },
  {
    address: "0x7890123456789012345678901234567890123456" as `0x${string}`,
    colorId: 5, // Yellow
    role: Role.Crewmate,
    location: Location.Storage,
    isAlive: true,
    tasksCompleted: 1,
    totalTasks: 5,
    hasVoted: false,
  },
  {
    address: "0x8901234567890123456789012345678901234567" as `0x${string}`,
    colorId: 10, // Cyan
    role: Role.Crewmate,
    location: Location.UpperEngine,
    isAlive: true,
    tasksCompleted: 3,
    totalTasks: 5,
    hasVoted: false,
  },
];

const mockDeadBodies: DeadBody[] = [
  {
    victim: "0x4567890123456789012345678901234567890123" as `0x${string}`,
    location: Location.Electrical,
    round: 2n,
    reported: false,
  },
];

const initialLogs: GameLog[] = [
  { type: "start", message: "Game started! Find the impostor!", timestamp: Date.now() - 120000 },
  { type: "task", message: "Red completed Wiring in Electrical", timestamp: Date.now() - 100000, round: 1n },
  { type: "task", message: "Green completed Scan in MedBay", timestamp: Date.now() - 80000, round: 1n },
  { type: "task", message: "Orange completed Download in Admin", timestamp: Date.now() - 60000, round: 2n },
];

type GameView = "menu" | "game" | "voting" | "end";

export default function Home() {
  const [view, setView] = useState<GameView>("menu");
  const [players, setPlayers] = useState<Player[]>(mockPlayers);
  const [deadBodies, setDeadBodies] = useState<DeadBody[]>(mockDeadBodies);
  // Removed selectedRoom state - using ScrollableMap instead
  const [showBodyReported, setShowBodyReported] = useState(false);
  const [showEjection, setShowEjection] = useState(false);
  const [showGameEnd, setShowGameEnd] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [tasksCompleted, setTasksCompleted] = useState(16);
  const [ejectedPlayer, setEjectedPlayer] = useState<Player | null>(null);
  const [logs, setLogs] = useState<GameLog[]>(initialLogs);
  const [gameWon, setGameWon] = useState(true);
  const [spotlightedPlayer, setSpotlightedPlayer] = useState<`0x${string}` | null>(null);

  const currentPlayer = mockPlayers[0].address;
  const currentPlayerData = players.find((p) => p.address === currentPlayer);

  // Simulate agent movement every few seconds
  useEffect(() => {
    if (view !== "game") return;

    const moveInterval = setInterval(() => {
      setPlayers(prev => {
        const newPlayers = [...prev];
        // Randomly move 1-2 players
        const movingCount = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < movingCount; i++) {
          const aliveIndices = newPlayers
            .map((p, idx) => p.isAlive && p.address !== currentPlayer ? idx : -1)
            .filter(idx => idx >= 0);

          if (aliveIndices.length > 0) {
            const randomIdx = aliveIndices[Math.floor(Math.random() * aliveIndices.length)];
            const locations = Object.values(Location).filter(l => typeof l === 'number') as Location[];
            const newLocation = locations[Math.floor(Math.random() * locations.length)];
            const oldLocation = newPlayers[randomIdx].location;

            if (newLocation !== oldLocation) {
              newPlayers[randomIdx] = { ...newPlayers[randomIdx], location: newLocation };

              // Add movement log
              const playerColor = PlayerColors[newPlayers[randomIdx].colorId].name;
              setLogs(prevLogs => [...prevLogs, {
                type: "task" as const,
                message: `${playerColor} moved to ${LocationNames[newLocation]}`,
                timestamp: Date.now(),
              }]);
            }
          }
        }
        return newPlayers;
      });
    }, 4000);

    return () => clearInterval(moveInterval);
  }, [view, currentPlayer]);

  // Timer countdown
  useEffect(() => {
    if (view === "voting" && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((t) => Math.max(0, t - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [view, timeRemaining]);

  const handlePlay = () => {
    setView("game");
    setLogs([...initialLogs, {
      type: "start",
      message: "You joined the game as Red",
      timestamp: Date.now(),
    }]);
  };

  const handleMoveToRoom = (location: Location) => {
    // Move current player to the selected room
    setPlayers(prev => prev.map(p =>
      p.address === currentPlayer ? { ...p, location } : p
    ));

    setLogs(prev => [...prev, {
      type: "task",
      message: `You moved to ${LocationNames[location]}`,
      timestamp: Date.now(),
    }]);
  };

  const handleReport = () => {
    setShowBodyReported(true);
    setLogs(prev => [...prev, {
      type: "report",
      message: "Dead body reported!",
      timestamp: Date.now(),
    }]);
  };

  const handleBodyReportedDismiss = () => {
    setShowBodyReported(false);
    setTimeRemaining(30);
    setHasVoted(false);
    setView("voting");
  };

  const handleVote = (target: `0x${string}` | null) => {
    setHasVoted(true);

    setTimeout(() => {
      const votedPlayer = target ? players.find((p) => p.address === target) : null;
      if (votedPlayer) {
        setEjectedPlayer(votedPlayer);
        setShowEjection(true);
        setView("game");

        setLogs(prev => [...prev, {
          type: "eject",
          message: `${PlayerColors[votedPlayer.colorId].name} was ejected`,
          timestamp: Date.now(),
        }]);

        // Remove ejected player
        setPlayers(prev => prev.map(p =>
          p.address === target ? { ...p, isAlive: false } : p
        ));
      } else {
        setView("game");
        setLogs(prev => [...prev, {
          type: "vote",
          message: "No one was ejected (Skipped)",
          timestamp: Date.now(),
        }]);
      }
    }, 2000);
  };

  const handleEjectionDismiss = () => {
    setShowEjection(false);
    setEjectedPlayer(null);
  };

  const handleKill = () => {
    // Find a nearby player to kill
    const myLocation = currentPlayerData?.location;
    const targets = players.filter(p =>
      p.isAlive &&
      p.address !== currentPlayer &&
      p.location === myLocation &&
      p.role !== Role.Impostor
    );

    if (targets.length > 0) {
      const victim = targets[0];
      setPlayers(prev => prev.map(p =>
        p.address === victim.address ? { ...p, isAlive: false } : p
      ));
      setDeadBodies(prev => [...prev, {
        victim: victim.address,
        location: victim.location,
        round: 1n,
        reported: false,
      }]);
      setLogs(prev => [...prev, {
        type: "kill",
        message: `${PlayerColors[victim.colorId].name} was killed!`,
        timestamp: Date.now(),
      }]);
    }
  };

  // Check for bodies in current location
  const bodiesInCurrentLocation = deadBodies.filter(b =>
    !b.reported &&
    b.location === currentPlayerData?.location
  );

  return (
    <>
      <AnimatePresence mode="wait">
        {view === "menu" && <MainMenu key="menu" onPlay={handlePlay} />}

        {view === "game" && (
          <div key="game" className="fixed inset-0">
            {/* Fullscreen Map */}
            <ScrollableMap
              players={players}
              deadBodies={deadBodies}
              currentPlayer={currentPlayer}
              onPlayerMove={handleMoveToRoom}
              spotlightedPlayer={spotlightedPlayer}
              onSpotlightPlayer={setSpotlightedPlayer}
            />

            {/* Task bar - overlay at top */}
            <div className="fixed top-0 left-0 right-0 z-40 p-4">
              <TaskBar completed={tasksCompleted} total={25} />
            </div>

            {/* Right sidebar - overlay */}
            <div className="fixed top-20 right-4 w-64 space-y-3 z-40">
              {/* Players list */}
              <div className="bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-gray-700">
                <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">
                  Players ({players.filter(p => p.isAlive).length}/{players.length})
                </h3>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {players.map((player) => {
                    const isSpotlighted = player.address === spotlightedPlayer;
                    return (
                      <div
                        key={player.address}
                        onClick={() => {
                          if (player.isAlive && player.address !== currentPlayer) {
                            setSpotlightedPlayer(isSpotlighted ? null : player.address);
                          }
                        }}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                          !player.isAlive ? "opacity-40 cursor-not-allowed" : "hover:bg-white/10"
                        } ${player.address === currentPlayer ? "bg-blue-900/40" : ""} ${
                          isSpotlighted ? "bg-yellow-900/50 ring-2 ring-yellow-500" : ""
                        }`}
                      >
                        <div className="relative">
                          <AmongUsSprite colorId={player.colorId} size={28} showShadow={false} />
                          {isSpotlighted && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                              <span className="text-[8px] text-black font-bold">★</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span
                            className="text-sm font-bold block truncate"
                            style={{ color: PlayerColors[player.colorId].light }}
                          >
                            {PlayerColors[player.colorId].name}
                            {player.address === currentPlayer && " (You)"}
                          </span>
                          <span className="text-xs text-gray-400">
                            {LocationNames[player.location]}
                          </span>
                        </div>
                        {!player.isAlive && <span className="text-red-500 text-xs font-bold">DEAD</span>}
                        {isSpotlighted && <span className="text-yellow-400 text-sm">👁️</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Game log */}
              <div className="bg-black/80 backdrop-blur-sm rounded-lg border border-gray-700">
                <GameLogPanel logs={logs} maxHeight="180px" />
              </div>

              {/* Demo controls */}
              <div className="bg-black/80 backdrop-blur-sm rounded-lg p-3 space-y-2 border border-gray-700">
                <h3 className="text-white font-bold text-sm">Demo Controls</h3>
                <button
                  onClick={handleReport}
                  disabled={bodiesInCurrentLocation.length === 0}
                  className={`w-full px-3 py-2 rounded font-bold text-sm transition-colors ${
                    bodiesInCurrentLocation.length > 0
                      ? "bg-orange-600 text-white hover:bg-orange-500"
                      : "bg-gray-700 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Report Body {bodiesInCurrentLocation.length > 0 && `(${bodiesInCurrentLocation.length})`}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setGameWon(true);
                      setShowGameEnd(true);
                    }}
                    className="px-2 py-2 bg-green-600 text-white rounded font-bold text-xs hover:bg-green-500"
                  >
                    Victory
                  </button>
                  <button
                    onClick={() => {
                      setGameWon(false);
                      setShowGameEnd(true);
                    }}
                    className="px-2 py-2 bg-red-600 text-white rounded font-bold text-xs hover:bg-red-500"
                  >
                    Defeat
                  </button>
                </div>
                <button
                  onClick={() => setView("menu")}
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded font-bold text-sm hover:bg-gray-500"
                >
                  Back to Menu
                </button>
              </div>
            </div>

            {/* Action buttons - overlay at bottom */}
            <ActionButtons
              role={currentPlayerData?.role || Role.Crewmate}
              canKill={currentPlayerData?.role === Role.Impostor}
              canReport={bodiesInCurrentLocation.length > 0}
              canVent={currentPlayerData?.role === Role.Impostor}
              canSabotage={currentPlayerData?.role === Role.Impostor}
              onReport={handleReport}
              onKill={handleKill}
              onVent={() => console.log("Vent!")}
              onSabotage={() => console.log("Sabotage!")}
            />
          </div>
        )}

        {view === "voting" && (
          <VotingScreen
            key="voting"
            players={players}
            currentPlayer={currentPlayer}
            onVote={handleVote}
            hasVoted={hasVoted}
            timeRemaining={timeRemaining}
            reporterColorId={0}
          />
        )}
      </AnimatePresence>

      {/* Event screens */}
      <DeadBodyReportedScreen
        isVisible={showBodyReported}
        onDismiss={handleBodyReportedDismiss}
      />

      <EjectionScreen
        isVisible={showEjection}
        ejectedColorId={ejectedPlayer?.colorId || 0}
        ejectedName={ejectedPlayer ? PlayerColors[ejectedPlayer.colorId].name : "Unknown"}
        wasImpostor={ejectedPlayer?.role === Role.Impostor}
        impostorsRemaining={players.filter(p => p.role === Role.Impostor && p.isAlive).length}
        onDismiss={handleEjectionDismiss}
      />

      <AmongUsGameEndScreen
        isVisible={showGameEnd}
        crewmatesWon={gameWon}
        playerColorId={currentPlayerData?.colorId || 0}
        wasImpostor={currentPlayerData?.role === Role.Impostor}
        onContinue={() => {
          setShowGameEnd(false);
          setView("menu");
        }}
      />
    </>
  );
}
