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
  LobbyScreen,
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
  Agent,
  GameRoom,
  RoomStatus,
} from "@/types/game";

// Mock data for demonstration - fresh game start (6 players max)
// All players spawn in Cafeteria, all alive, no tasks completed yet
// Roles are hidden (shown as None) until game logic reveals them
const mockPlayers: Player[] = [
  {
    address: "0x1234567890123456789012345678901234567890" as `0x${string}`,
    colorId: 0, // Red (You)
    role: Role.Crewmate,
    location: Location.Cafeteria,
    isAlive: true,
    tasksCompleted: 0,
    totalTasks: 5,
    hasVoted: false,
  },
  {
    address: "0x2345678901234567890123456789012345678901" as `0x${string}`,
    colorId: 1, // Blue
    role: Role.Impostor, // Hidden from other players
    location: Location.Cafeteria,
    isAlive: true,
    tasksCompleted: 0,
    totalTasks: 5,
    hasVoted: false,
  },
  {
    address: "0x3456789012345678901234567890123456789012" as `0x${string}`,
    colorId: 2, // Green
    role: Role.Crewmate,
    location: Location.Cafeteria,
    isAlive: true,
    tasksCompleted: 0,
    totalTasks: 5,
    hasVoted: false,
  },
  {
    address: "0x4567890123456789012345678901234567890123" as `0x${string}`,
    colorId: 3, // Pink
    role: Role.Crewmate,
    location: Location.Cafeteria,
    isAlive: true,
    tasksCompleted: 0,
    totalTasks: 5,
    hasVoted: false,
  },
  {
    address: "0x5678901234567890123456789012345678901234" as `0x${string}`,
    colorId: 4, // Orange
    role: Role.Crewmate,
    location: Location.Cafeteria,
    isAlive: true,
    tasksCompleted: 0,
    totalTasks: 5,
    hasVoted: false,
  },
  {
    address: "0x6789012345678901234567890123456789012345" as `0x${string}`,
    colorId: 8, // Purple
    role: Role.Crewmate,
    location: Location.Cafeteria,
    isAlive: true,
    tasksCompleted: 0,
    totalTasks: 5,
    hasVoted: false,
  },
];

// No dead bodies at game start - bodies only appear when impostor kills
const mockDeadBodies: DeadBody[] = [];

// Initial logs - just game start
const initialLogs: GameLog[] = [
  { type: "start", message: "Game started! Find the impostor among 6 players.", timestamp: Date.now() },
  { type: "join", message: "All players have joined. Roles assigned secretly.", timestamp: Date.now() - 1000 },
];

// Mock agents for lobby demonstration - 8 agents total
const mockAgents: Agent[] = [
  {
    address: "0x1234567890123456789012345678901234567890" as `0x${string}`,
    name: "Agent Alpha",
    balance: BigInt("5000000000000000000"), // 5 MON - highest, can create rooms
    isRegistered: true,
    colorId: 0, // Red
    gamesPlayed: 12,
    wins: 8,
  },
  {
    address: "0x2345678901234567890123456789012345678901" as `0x${string}`,
    name: "Agent Beta",
    balance: BigInt("3500000000000000000"), // 3.5 MON
    isRegistered: true,
    colorId: 1, // Blue
    gamesPlayed: 8,
    wins: 3,
  },
  {
    address: "0x3456789012345678901234567890123456789012" as `0x${string}`,
    name: "Agent Gamma",
    balance: BigInt("2000000000000000000"), // 2 MON
    isRegistered: true,
    colorId: 2, // Green
    gamesPlayed: 15,
    wins: 7,
  },
  {
    address: "0x4567890123456789012345678901234567890123" as `0x${string}`,
    name: "Agent Delta",
    balance: BigInt("1500000000000000000"), // 1.5 MON
    isRegistered: true,
    colorId: 3, // Pink
    gamesPlayed: 5,
    wins: 2,
  },
  {
    address: "0x5678901234567890123456789012345678901234" as `0x${string}`,
    name: "Agent Epsilon",
    balance: BigInt("4000000000000000000"), // 4 MON
    isRegistered: true,
    colorId: 4, // Orange
    gamesPlayed: 20,
    wins: 12,
  },
  {
    address: "0x6789012345678901234567890123456789012345" as `0x${string}`,
    name: "Agent Zeta",
    balance: BigInt("2500000000000000000"), // 2.5 MON
    isRegistered: true,
    colorId: 8, // Purple
    gamesPlayed: 10,
    wins: 4,
  },
  {
    address: "0x7890123456789012345678901234567890123456" as `0x${string}`,
    name: "Agent Eta",
    balance: BigInt("1800000000000000000"), // 1.8 MON
    isRegistered: true,
    colorId: 5, // Yellow
    gamesPlayed: 18,
    wins: 9,
  },
  {
    address: "0x8901234567890123456789012345678901234567" as `0x${string}`,
    name: "Agent Theta",
    balance: BigInt("3000000000000000000"), // 3 MON
    isRegistered: true,
    colorId: 10, // Cyan
    gamesPlayed: 14,
    wins: 6,
  },
];

// Current user is Agent Alpha (has highest balance, can create rooms)
const currentAgent = mockAgents[0];

// The agent with highest balance can create rooms
const roomCreator = mockAgents.reduce((highest, agent) =>
  agent.balance > highest.balance ? agent : highest
).address;

type GameView = "menu" | "lobby" | "game" | "voting" | "end";

export default function Home() {
  const [view, setView] = useState<GameView>("menu");
  const [players, setPlayers] = useState<Player[]>(mockPlayers);
  const [deadBodies, setDeadBodies] = useState<DeadBody[]>(mockDeadBodies);
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

  // Lobby state
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [roomIdCounter, setRoomIdCounter] = useState(0);
  const [lobbyLogs, setLobbyLogs] = useState<string[]>(["Initializing agent network..."]);

  // For spectator mode, we pick a random player to "follow"
  const currentPlayer = players[0]?.address || mockPlayers[0].address;
  const currentPlayerData = players.find((p) => p.address === currentPlayer);

  // Autonomous agent behavior in lobby
  useEffect(() => {
    if (view !== "lobby") return;

    const agentActions = async () => {
      // Step 1: Room creator creates a room after a delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      const creatorAgent = mockAgents.find(a => a.address === roomCreator);
      if (!creatorAgent) return;

      setLobbyLogs(prev => [...prev, `${creatorAgent.name} is creating a room...`]);

      await new Promise(resolve => setTimeout(resolve, 1500));

      const newRoomId = 1;
      const wagerAmount = BigInt("500000000000000000"); // 0.5 MON

      const newRoom: GameRoom = {
        roomId: newRoomId,
        creator: creatorAgent.address,
        players: [creatorAgent],
        wagerAmount,
        maxPlayers: 8, // Max 8 agents per game
        status: RoomStatus.Open,
        createdAt: Date.now(),
      };

      setRooms([newRoom]);
      setLobbyLogs(prev => [...prev, `Room #${newRoomId} created with 0.50 MON wager (Min: 6, Max: 8)`]);

      // Step 2: Other agents join one by one (7 more to fill the room)
      const otherAgents = mockAgents.filter(a => a.address !== roomCreator);

      for (let i = 0; i < Math.min(otherAgents.length, 7); i++) {
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

        const joiningAgent = otherAgents[i];
        setLobbyLogs(prev => [...prev, `${joiningAgent.name} is joining...`]);

        await new Promise(resolve => setTimeout(resolve, 800));

        setRooms(prev => prev.map(room => {
          if (room.roomId === newRoomId && room.status === RoomStatus.Open) {
            const updatedPlayers = [...room.players, joiningAgent];
            return {
              ...room,
              players: updatedPlayers,
              status: updatedPlayers.length >= room.maxPlayers ? RoomStatus.Full : RoomStatus.Open,
            };
          }
          return room;
        }));

        setLobbyLogs(prev => [...prev, `${joiningAgent.name} joined Room #${newRoomId}`]);
      }
    };

    agentActions();
  }, [view]);

  // Simulate autonomous agent behavior (movement, tasks, kills)
  useEffect(() => {
    if (view !== "game") return;

    // Room connections for valid movement (agents can only move to adjacent rooms)
    const ADJACENT_ROOMS: Record<Location, Location[]> = {
      [Location.Cafeteria]: [Location.MedBay, Location.Admin],
      [Location.MedBay]: [Location.Cafeteria, Location.UpperEngine, Location.Security],
      [Location.UpperEngine]: [Location.MedBay, Location.Security],
      [Location.Security]: [Location.UpperEngine, Location.LowerEngine, Location.Electrical, Location.MedBay],
      [Location.LowerEngine]: [Location.Security, Location.Electrical, Location.Reactor],
      [Location.Electrical]: [Location.Security, Location.LowerEngine, Location.Storage],
      [Location.Storage]: [Location.Electrical, Location.Admin],
      [Location.Admin]: [Location.Cafeteria, Location.Storage],
      [Location.Reactor]: [Location.LowerEngine],
    };

    // Agent movement - move through corridors (one room at a time)
    // Slower interval so walking animation has time to complete
    const moveInterval = setInterval(() => {
      setPlayers(prev => {
        const newPlayers = [...prev];
        // Only 1 agent moves at a time to make it more realistic
        const aliveAgents = newPlayers.filter(p => p.isAlive);

        if (aliveAgents.length > 0 && Math.random() > 0.4) {
          const mover = aliveAgents[Math.floor(Math.random() * aliveAgents.length)];
          const moverIdx = newPlayers.findIndex(p => p.address === mover.address);

          // Get adjacent rooms only
          const adjacentRooms = ADJACENT_ROOMS[mover.location] || [];
          if (adjacentRooms.length > 0) {
            const newLocation = adjacentRooms[Math.floor(Math.random() * adjacentRooms.length)];

            newPlayers[moverIdx] = { ...newPlayers[moverIdx], location: newLocation };

            const playerColor = PlayerColors[mover.colorId].name;
            setLogs(prevLogs => [...prevLogs, {
              type: "task" as const,
              message: `${playerColor} walked to ${LocationNames[newLocation]}`,
              timestamp: Date.now(),
            }]);
          }
        }
        return newPlayers;
      });
    }, 5000); // Slower - 5 seconds between moves

    // Crewmate task completion
    const taskInterval = setInterval(() => {
      setPlayers(prev => {
        const crewmates = prev.filter(p => p.isAlive && p.role === Role.Crewmate && p.tasksCompleted < p.totalTasks);
        if (crewmates.length > 0 && Math.random() > 0.5) {
          const worker = crewmates[Math.floor(Math.random() * crewmates.length)];
          const playerColor = PlayerColors[worker.colorId].name;
          setLogs(prevLogs => [...prevLogs, {
            type: "task" as const,
            message: `${playerColor} completed a task in ${LocationNames[worker.location]}`,
            timestamp: Date.now(),
          }]);
          setTasksCompleted(t => t + 1);
          return prev.map(p =>
            p.address === worker.address ? { ...p, tasksCompleted: p.tasksCompleted + 1 } : p
          );
        }
        return prev;
      });
    }, 6000);

    // Impostor kill attempts - smart behavior checking for nearby witnesses
    const killInterval = setInterval(() => {
      setPlayers(prev => {
        const impostor = prev.find(p => p.isAlive && p.role === Role.Impostor);
        if (!impostor) return prev;

        // Get adjacent rooms to check for potential witnesses
        const adjacentRooms = ADJACENT_ROOMS[impostor.location] || [];

        // Find crewmates in same location (potential targets)
        const targets = prev.filter(p =>
          p.isAlive &&
          p.role === Role.Crewmate &&
          p.location === impostor.location
        );

        // Check for witnesses in the SAME room
        const witnessesInRoom = prev.filter(p =>
          p.isAlive &&
          p.location === impostor.location &&
          p.address !== impostor.address &&
          p.role !== Role.Impostor
        );

        // Check for agents in ADJACENT rooms who might walk in
        const agentsNearby = prev.filter(p =>
          p.isAlive &&
          p.address !== impostor.address &&
          adjacentRooms.includes(p.location)
        );

        // Impostor decision logic:
        // - Must have exactly 1 target (the victim)
        // - No other witnesses in the room
        // - Prefer when no agents are in adjacent rooms (lower risk)
        const isAloneWithTarget = targets.length === 1 && witnessesInRoom.length === 1;
        const noNearbyThreat = agentsNearby.length === 0;
        const lowRiskNearby = agentsNearby.length <= 1;

        // Safe kill: alone with target and no one nearby
        const safeToKill = isAloneWithTarget && noNearbyThreat;
        // Risky kill: alone with target but someone nearby (might walk in)
        const riskyKill = isAloneWithTarget && lowRiskNearby && !noNearbyThreat;

        // Decide whether to kill
        let shouldKill = false;
        if (safeToKill) {
          shouldKill = Math.random() > 0.3; // 70% chance when safe
        } else if (riskyKill) {
          shouldKill = Math.random() > 0.8; // 20% chance when risky
        }
        // If too many nearby, impostor withdraws (no kill attempt)

        if (shouldKill) {
          const victim = targets[0];

          // Check if this victim already has a dead body (prevent duplicates)
          setDeadBodies(bodies => {
            const alreadyDead = bodies.some(b => b.victim === victim.address);
            if (alreadyDead) return bodies;

            const victimColor = PlayerColors[victim.colorId].name;
            const impostorColor = PlayerColors[impostor.colorId].name;

            // Log the kill with context
            if (safeToKill) {
              setLogs(prevLogs => [...prevLogs, {
                type: "kill" as const,
                message: `${victimColor} was eliminated in ${LocationNames[victim.location]}! (No witnesses nearby)`,
                timestamp: Date.now(),
              }]);
            } else {
              setLogs(prevLogs => [...prevLogs, {
                type: "kill" as const,
                message: `${victimColor} was eliminated in ${LocationNames[victim.location]}! (Risky move)`,
                timestamp: Date.now(),
              }]);
            }

            return [...bodies, {
              victim: victim.address,
              location: victim.location,
              round: 1n,
              reported: false,
            }];
          });

          return prev.map(p =>
            p.address === victim.address ? { ...p, isAlive: false } : p
          );
        }

        return prev;
      });
    }, 8000); // Check every 8 seconds for kill opportunity

    // Body discovery and reporting
    const reportInterval = setInterval(() => {
      // Check if any alive agent is in a room with an unreported body
      setDeadBodies(prevBodies => {
        const unreportedBodies = prevBodies.filter(b => !b.reported);
        if (unreportedBodies.length === 0) return prevBodies;

        // Check each unreported body
        for (const body of unreportedBodies) {
          // Find alive agents in the same room as this body
          const agentsInRoom = players.filter(p =>
            p.isAlive &&
            p.location === body.location &&
            p.address !== body.victim // Not the victim themselves
          );

          if (agentsInRoom.length > 0 && Math.random() > 0.5) {
            // An agent discovers and reports the body
            const reporter = agentsInRoom[Math.floor(Math.random() * agentsInRoom.length)];
            const reporterColor = PlayerColors[reporter.colorId].name;
            const victim = players.find(p => p.address === body.victim);
            const victimColor = victim ? PlayerColors[victim.colorId].name : "Unknown";

            setLogs(prevLogs => [...prevLogs, {
              type: "report" as const,
              message: `${reporterColor} reported ${victimColor}'s body in ${LocationNames[body.location]}!`,
              timestamp: Date.now(),
            }]);

            // Show the body reported screen
            setShowBodyReported(true);

            // Mark body as reported
            return prevBodies.map(b =>
              b.victim === body.victim ? { ...b, reported: true } : b
            );
          }
        }

        return prevBodies;
      });
    }, 4000); // Check for bodies every 4 seconds

    return () => {
      clearInterval(moveInterval);
      clearInterval(taskInterval);
      clearInterval(killInterval);
      clearInterval(reportInterval);
    };
  }, [view, players]);

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
    // Reset lobby state for fresh start
    setRooms([]);
    setLobbyLogs(["Initializing agent network..."]);
    setView("lobby");
  };

  // Start game when called from lobby (auto-triggered)
  const handleGameStart = (roomId: number) => {
    const room = rooms.find(r => r.roomId === roomId);
    if (!room || room.players.length < 6) return; // Minimum 6 agents

    // Update room status
    setRooms(prev => prev.map(r =>
      r.roomId === roomId ? { ...r, status: RoomStatus.InGame } : r
    ));

    // Convert room players to game players (max 8 agents)
    // Randomly assign impostor role
    const impostorIndex = Math.floor(Math.random() * room.players.length);
    const gamePlayers: Player[] = room.players.slice(0, 8).map((agent, index) => ({
      address: agent.address,
      colorId: agent.colorId,
      role: index === impostorIndex ? Role.Impostor : Role.Crewmate,
      location: Location.Cafeteria,
      isAlive: true,
      tasksCompleted: 0,
      totalTasks: 5,
      hasVoted: false,
    }));

    setPlayers(gamePlayers);
    setDeadBodies([]);
    setTasksCompleted(0);
    setLogs([
      { type: "start", message: `Game started! Spectating ${gamePlayers.length} agents.`, timestamp: Date.now() },
      { type: "join", message: "All agents spawned in Cafeteria. Roles assigned secretly.", timestamp: Date.now() - 1000 },
    ]);
    setView("game");
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

  // Auto-dismiss body reported screen after 3 seconds (spectator mode)
  useEffect(() => {
    if (showBodyReported) {
      const timer = setTimeout(() => {
        handleBodyReportedDismiss();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showBodyReported]);

  // Autonomous voting - agents vote after discussion
  useEffect(() => {
    if (view !== "voting") return;

    // Simulate agents discussing and voting
    const voteTimer = setTimeout(() => {
      // Each agent "votes" - randomly choose a target or skip
      const alivePlayers = players.filter(p => p.isAlive);
      const votes: Record<string, number> = {};

      alivePlayers.forEach(voter => {
        // Agents have a tendency to vote for suspicious players (random for now)
        // Skip vote 20% of the time
        if (Math.random() < 0.2) {
          votes["skip"] = (votes["skip"] || 0) + 1;
        } else {
          // Vote for a random other alive player
          const targets = alivePlayers.filter(p => p.address !== voter.address);
          if (targets.length > 0) {
            const target = targets[Math.floor(Math.random() * targets.length)];
            votes[target.address] = (votes[target.address] || 0) + 1;
          }
        }
      });

      // Find the player with most votes
      let maxVotes = 0;
      let ejectedAddress: string | null = null;

      Object.entries(votes).forEach(([addr, count]) => {
        if (count > maxVotes && addr !== "skip") {
          maxVotes = count;
          ejectedAddress = addr;
        }
      });

      // Need majority to eject (more than half of alive players)
      const skipVotes = votes["skip"] || 0;
      const majority = Math.floor(alivePlayers.length / 2) + 1;

      if (maxVotes >= majority && ejectedAddress) {
        // Someone is ejected
        const ejected = players.find(p => p.address === ejectedAddress);
        if (ejected) {
          setEjectedPlayer(ejected);
          setShowEjection(true);

          const ejectedColor = PlayerColors[ejected.colorId].name;
          setLogs(prev => [...prev, {
            type: "eject" as const,
            message: `${ejectedColor} was ejected with ${maxVotes} votes`,
            timestamp: Date.now(),
          }]);

          // Mark as dead
          setPlayers(prev => prev.map(p =>
            p.address === ejectedAddress ? { ...p, isAlive: false } : p
          ));
        }
        setView("game");
      } else {
        // No one ejected
        setLogs(prev => [...prev, {
          type: "vote" as const,
          message: `No one was ejected. (Skip: ${skipVotes}, Highest: ${maxVotes})`,
          timestamp: Date.now(),
        }]);
        setView("game");
      }
    }, 5000); // 5 seconds of "discussion" before voting completes

    return () => clearTimeout(voteTimer);
  }, [view, players]);

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

  // Auto-dismiss ejection screen after 4 seconds (spectator mode)
  useEffect(() => {
    if (showEjection) {
      const timer = setTimeout(() => {
        handleEjectionDismiss();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showEjection]);

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

        {view === "lobby" && (
          <LobbyScreen
            key="lobby"
            agents={mockAgents}
            rooms={rooms}
            roomCreator={roomCreator}
            onGameStart={handleGameStart}
            onBack={() => setView("menu")}
          />
        )}

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

            {/* Spectator badge */}
            <div className="fixed top-4 right-4 z-50">
              <div className="flex items-center gap-2 bg-purple-900/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-purple-500/50">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-purple-200 text-sm font-medium">Spectating</span>
              </div>
            </div>

            {/* Right sidebar - overlay */}
            <div className="fixed top-20 right-4 w-64 space-y-3 z-40">
              {/* Agents list */}
              <div className="bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-gray-700">
                <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">
                  Agents ({players.filter(p => p.isAlive).length}/{players.length} alive)
                </h3>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {players.map((player) => {
                    const isSpotlighted = player.address === spotlightedPlayer;
                    return (
                      <div
                        key={player.address}
                        onClick={() => {
                          if (player.isAlive) {
                            setSpotlightedPlayer(isSpotlighted ? null : player.address);
                          }
                        }}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                          !player.isAlive ? "opacity-40" : "hover:bg-white/10"
                        } ${isSpotlighted ? "bg-yellow-900/50 ring-2 ring-yellow-500" : ""}`}
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

              {/* Spectator controls */}
              <div className="bg-black/80 backdrop-blur-sm rounded-lg p-3 space-y-2 border border-gray-700">
                <h3 className="text-white font-bold text-sm">Spectator Controls</h3>
                <p className="text-gray-400 text-xs">
                  Click on an agent to follow them on the map
                </p>
                <div className="p-2 bg-slate-900/50 rounded text-center">
                  <div className="text-xs text-gray-500">Dead Bodies</div>
                  <div className="text-lg font-bold text-red-400">{deadBodies.length}</div>
                </div>
                <button
                  onClick={() => setView("menu")}
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded font-bold text-sm hover:bg-gray-500"
                >
                  Exit Spectator
                </button>
              </div>
            </div>
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
