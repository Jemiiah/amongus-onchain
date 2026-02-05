"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Player, Location, LocationNames, DeadBody as DeadBodyType, PlayerColors } from "@/types/game";
import { AmongUsSprite, DeadBodySprite } from "./AmongUsSprite";

interface ScrollableMapProps {
  players: Player[];
  deadBodies: DeadBodyType[];
  currentPlayer?: `0x${string}`;
  onPlayerMove?: (location: Location) => void;
  spotlightedPlayer?: `0x${string}` | null;
  onSpotlightPlayer?: (address: `0x${string}` | null) => void;
}

const MAP_WIDTH = 3200;
const MAP_HEIGHT = 2400;

// Room configurations - clean layout with no overlaps
const ROOMS: Record<Location, {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  floorColor: string;
  name: string;
  // Walking points inside the room
  entryPoints: { [key: string]: { x: number; y: number } };
  center: { x: number; y: number };
}> = {
  [Location.Cafeteria]: {
    x: 1300, y: 100,
    width: 550, height: 380,
    color: "#4a5568", floorColor: "#5a6578",
    name: "CAFETERIA",
    center: { x: 1575, y: 320 },
    entryPoints: {
      left: { x: 1300, y: 320 },
      bottom: { x: 1575, y: 480 },
    },
  },
  [Location.MedBay]: {
    x: 750, y: 200,
    width: 340, height: 280,
    color: "#3a5a4a", floorColor: "#4a6a5a",
    name: "MEDBAY",
    center: { x: 920, y: 360 },
    entryPoints: {
      right: { x: 1090, y: 360 },
      left: { x: 750, y: 360 },
      bottom: { x: 920, y: 480 },
    },
  },
  [Location.UpperEngine]: {
    x: 150, y: 100,
    width: 340, height: 320,
    color: "#5a3a3a", floorColor: "#6a4a4a",
    name: "UPPER ENGINE",
    center: { x: 320, y: 280 },
    entryPoints: {
      right: { x: 490, y: 280 },
      bottom: { x: 320, y: 420 },
    },
  },
  [Location.Security]: {
    x: 150, y: 580,
    width: 320, height: 280,
    color: "#3a3a5a", floorColor: "#4a4a6a",
    name: "SECURITY",
    center: { x: 310, y: 730 },
    entryPoints: {
      top: { x: 310, y: 580 },
      bottom: { x: 310, y: 860 },
      right: { x: 470, y: 730 },
    },
  },
  [Location.LowerEngine]: {
    x: 150, y: 1020,
    width: 340, height: 320,
    color: "#5a3a3a", floorColor: "#6a4a4a",
    name: "LOWER ENGINE",
    center: { x: 320, y: 1200 },
    entryPoints: {
      top: { x: 320, y: 1020 },
      right: { x: 490, y: 1200 },
      bottom: { x: 320, y: 1340 },
    },
  },
  [Location.Electrical]: {
    x: 600, y: 1000,
    width: 320, height: 300,
    color: "#3a4a5a", floorColor: "#4a5a6a",
    name: "ELECTRICAL",
    center: { x: 760, y: 1170 },
    entryPoints: {
      left: { x: 600, y: 1170 },
      right: { x: 920, y: 1170 },
      top: { x: 760, y: 1000 },
    },
  },
  [Location.Storage]: {
    x: 1100, y: 1100,
    width: 420, height: 360,
    color: "#5a4a3a", floorColor: "#6a5a4a",
    name: "STORAGE",
    center: { x: 1310, y: 1300 },
    entryPoints: {
      left: { x: 1100, y: 1300 },
      top: { x: 1310, y: 1100 },
    },
  },
  [Location.Admin]: {
    x: 1450, y: 620,
    width: 360, height: 300,
    color: "#4a5568", floorColor: "#5a6578",
    name: "ADMIN",
    center: { x: 1630, y: 790 },
    entryPoints: {
      top: { x: 1630, y: 620 },
      bottom: { x: 1630, y: 920 },
    },
  },
  [Location.Reactor]: {
    x: 150, y: 1520,
    width: 380, height: 280,
    color: "#5a4a3a", floorColor: "#6a5a4a",
    name: "REACTOR",
    center: { x: 340, y: 1680 },
    entryPoints: {
      top: { x: 340, y: 1520 },
    },
  },
};

// Corridor definitions - visual paths between rooms
const CORRIDORS = [
  // Upper horizontal corridor (Upper Engine - MedBay - Cafeteria)
  { x: 490, y: 240, width: 260, height: 80 },  // Upper Engine to MedBay
  { x: 1090, y: 300, width: 210, height: 80 }, // MedBay to Cafeteria

  // Left vertical corridor (Upper Engine - Security - Lower Engine)
  { x: 270, y: 420, width: 80, height: 160 },  // Upper Engine to Security
  { x: 270, y: 860, width: 80, height: 160 },  // Security to Lower Engine

  // Lower Engine to Reactor
  { x: 270, y: 1340, width: 80, height: 180 }, // Lower Engine to Reactor

  // Security to Electrical
  { x: 470, y: 680, width: 130, height: 80 },  // Security right
  { x: 540, y: 760, width: 80, height: 240 },  // Vertical down to Electrical

  // Lower Engine to Electrical
  { x: 490, y: 1140, width: 110, height: 80 }, // Lower Engine to Electrical

  // Electrical to Storage
  { x: 920, y: 1140, width: 180, height: 80 }, // Electrical to Storage

  // Cafeteria to Admin
  { x: 1580, y: 480, width: 80, height: 140 }, // Cafeteria to Admin

  // Admin to Storage
  { x: 1580, y: 920, width: 80, height: 180 }, // Admin to Storage

  // MedBay to Security (diagonal path)
  { x: 710, y: 480, width: 80, height: 200 },  // MedBay down
];

// Graph of connected rooms with corridor waypoints
const ROOM_CONNECTIONS: Record<Location, { to: Location; path: { x: number; y: number }[] }[]> = {
  [Location.Cafeteria]: [
    { to: Location.MedBay, path: [{ x: 1300, y: 340 }, { x: 1200, y: 340 }, { x: 1090, y: 360 }] },
    { to: Location.Admin, path: [{ x: 1620, y: 480 }, { x: 1620, y: 550 }, { x: 1630, y: 620 }] },
  ],
  [Location.MedBay]: [
    { to: Location.Cafeteria, path: [{ x: 1090, y: 360 }, { x: 1200, y: 340 }, { x: 1300, y: 340 }] },
    { to: Location.UpperEngine, path: [{ x: 750, y: 360 }, { x: 620, y: 280 }, { x: 490, y: 280 }] },
    { to: Location.Security, path: [{ x: 750, y: 400 }, { x: 750, y: 580 }, { x: 600, y: 700 }, { x: 470, y: 730 }] },
  ],
  [Location.UpperEngine]: [
    { to: Location.MedBay, path: [{ x: 490, y: 280 }, { x: 620, y: 280 }, { x: 750, y: 360 }] },
    { to: Location.Security, path: [{ x: 320, y: 420 }, { x: 310, y: 500 }, { x: 310, y: 580 }] },
  ],
  [Location.Security]: [
    { to: Location.UpperEngine, path: [{ x: 310, y: 580 }, { x: 310, y: 500 }, { x: 320, y: 420 }] },
    { to: Location.LowerEngine, path: [{ x: 310, y: 860 }, { x: 310, y: 940 }, { x: 320, y: 1020 }] },
    { to: Location.Electrical, path: [{ x: 470, y: 730 }, { x: 580, y: 800 }, { x: 600, y: 1000 }, { x: 600, y: 1170 }] },
    { to: Location.MedBay, path: [{ x: 470, y: 730 }, { x: 600, y: 700 }, { x: 750, y: 580 }, { x: 750, y: 400 }] },
  ],
  [Location.LowerEngine]: [
    { to: Location.Security, path: [{ x: 320, y: 1020 }, { x: 310, y: 940 }, { x: 310, y: 860 }] },
    { to: Location.Electrical, path: [{ x: 490, y: 1200 }, { x: 550, y: 1170 }, { x: 600, y: 1170 }] },
    { to: Location.Reactor, path: [{ x: 320, y: 1340 }, { x: 320, y: 1440 }, { x: 340, y: 1520 }] },
  ],
  [Location.Electrical]: [
    { to: Location.LowerEngine, path: [{ x: 600, y: 1170 }, { x: 550, y: 1170 }, { x: 490, y: 1200 }] },
    { to: Location.Storage, path: [{ x: 920, y: 1170 }, { x: 1010, y: 1200 }, { x: 1100, y: 1300 }] },
    { to: Location.Security, path: [{ x: 600, y: 1170 }, { x: 600, y: 1000 }, { x: 580, y: 800 }, { x: 470, y: 730 }] },
  ],
  [Location.Storage]: [
    { to: Location.Electrical, path: [{ x: 1100, y: 1300 }, { x: 1010, y: 1200 }, { x: 920, y: 1170 }] },
    { to: Location.Admin, path: [{ x: 1310, y: 1100 }, { x: 1580, y: 1000 }, { x: 1630, y: 920 }] },
  ],
  [Location.Admin]: [
    { to: Location.Cafeteria, path: [{ x: 1630, y: 620 }, { x: 1620, y: 550 }, { x: 1620, y: 480 }] },
    { to: Location.Storage, path: [{ x: 1630, y: 920 }, { x: 1580, y: 1000 }, { x: 1310, y: 1100 }] },
  ],
  [Location.Reactor]: [
    { to: Location.LowerEngine, path: [{ x: 340, y: 1520 }, { x: 320, y: 1440 }, { x: 320, y: 1340 }] },
  ],
};

// BFS to find path between any two rooms
function findPath(from: Location, to: Location): { x: number; y: number }[] {
  if (from === to) return [];

  // Direct connection?
  const directConnection = ROOM_CONNECTIONS[from]?.find(c => c.to === to);
  if (directConnection) {
    return [...directConnection.path];
  }

  // BFS for multi-hop path
  const visited = new Set<Location>();
  const queue: { room: Location; path: { x: number; y: number }[] }[] = [
    { room: from, path: [] }
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.room)) continue;
    visited.add(current.room);

    const connections = ROOM_CONNECTIONS[current.room] || [];
    for (const conn of connections) {
      const newPath = [...current.path, ...conn.path];

      if (conn.to === to) {
        return newPath;
      }

      if (!visited.has(conn.to)) {
        queue.push({ room: conn.to, path: newPath });
      }
    }
  }

  // No path found - shouldn't happen
  return [];
}

interface PlayerPosition {
  x: number;
  y: number;
  waypoints: { x: number; y: number }[];
  currentWaypointIndex: number;
  isMoving: boolean;
  facingLeft: boolean;
}

export function ScrollableMap({
  players,
  deadBodies,
  currentPlayer,
  onPlayerMove,
  spotlightedPlayer,
  onSpotlightPlayer,
}: ScrollableMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [playerPositions, setPlayerPositions] = useState<Record<string, PlayerPosition>>({});
  const [previousLocations, setPreviousLocations] = useState<Record<string, Location>>({});

  // Initialize positions
  useEffect(() => {
    const positions: Record<string, PlayerPosition> = {};
    const locations: Record<string, Location> = {};

    players.forEach((player, idx) => {
      const room = ROOMS[player.location];
      const offsetX = ((idx % 3) - 1) * 60;
      const offsetY = (Math.floor(idx / 3)) * 50;

      positions[player.address] = {
        x: room.center.x + offsetX,
        y: room.center.y + offsetY,
        waypoints: [],
        currentWaypointIndex: 0,
        isMoving: false,
        facingLeft: false,
      };
      locations[player.address] = player.location;
    });

    if (Object.keys(playerPositions).length === 0) {
      setPlayerPositions(positions);
      setPreviousLocations(locations);
    }
  }, []);

  // Handle room changes
  useEffect(() => {
    players.forEach((player, idx) => {
      const prevLoc = previousLocations[player.address];
      const currLoc = player.location;

      if (prevLoc !== undefined && prevLoc !== currLoc) {
        const path = findPath(prevLoc, currLoc);
        const room = ROOMS[currLoc];
        const offsetX = ((idx % 3) - 1) * 60;
        const offsetY = (Math.floor(idx / 3)) * 50;

        // Add final position in room
        path.push({ x: room.center.x + offsetX, y: room.center.y + offsetY });

        setPlayerPositions(prev => ({
          ...prev,
          [player.address]: {
            ...prev[player.address],
            waypoints: path,
            currentWaypointIndex: 0,
            isMoving: true,
          },
        }));
      }
    });

    const newLocs: Record<string, Location> = {};
    players.forEach(p => newLocs[p.address] = p.location);
    setPreviousLocations(newLocs);
  }, [players]);

  // Animation loop
  useEffect(() => {
    const speed = 5;

    const interval = setInterval(() => {
      setPlayerPositions(prev => {
        const next = { ...prev };

        Object.keys(next).forEach(addr => {
          const pos = next[addr];
          if (!pos?.isMoving || pos.waypoints.length === 0) return;

          const target = pos.waypoints[pos.currentWaypointIndex];
          if (!target) {
            next[addr] = { ...pos, isMoving: false, waypoints: [] };
            return;
          }

          const dx = target.x - pos.x;
          const dy = target.y - pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < speed) {
            if (pos.currentWaypointIndex >= pos.waypoints.length - 1) {
              next[addr] = { ...pos, x: target.x, y: target.y, isMoving: false, waypoints: [] };
            } else {
              next[addr] = { ...pos, x: target.x, y: target.y, currentWaypointIndex: pos.currentWaypointIndex + 1 };
            }
          } else {
            next[addr] = {
              ...pos,
              x: pos.x + (dx / dist) * speed,
              y: pos.y + (dy / dist) * speed,
              facingLeft: dx < 0,
            };
          }
        });

        return next;
      });
    }, 16);

    return () => clearInterval(interval);
  }, []);

  // Camera
  const currentPlayerData = players.find(p => p.address === currentPlayer);
  const followedPlayer = spotlightedPlayer
    ? players.find(p => p.address === spotlightedPlayer)
    : currentPlayerData;

  useEffect(() => {
    if (!containerRef.current || !followedPlayer) return;
    const pos = playerPositions[followedPlayer.address];
    if (!pos) return;

    const c = containerRef.current;
    c.scrollTo({
      left: Math.max(0, Math.min(pos.x - c.clientWidth / 2, MAP_WIDTH - c.clientWidth)),
      top: Math.max(0, Math.min(pos.y - c.clientHeight / 2, MAP_HEIGHT - c.clientHeight)),
      behavior: 'smooth',
    });
  }, [followedPlayer?.location, spotlightedPlayer]);

  useEffect(() => {
    if (!spotlightedPlayer) return;
    const interval = setInterval(() => {
      const pos = playerPositions[spotlightedPlayer];
      if (pos?.isMoving && containerRef.current) {
        const c = containerRef.current;
        c.scrollTo({
          left: Math.max(0, Math.min(pos.x - c.clientWidth / 2, MAP_WIDTH - c.clientWidth)),
          top: Math.max(0, Math.min(pos.y - c.clientHeight / 2, MAP_HEIGHT - c.clientHeight)),
        });
      }
    }, 30);
    return () => clearInterval(interval);
  }, [spotlightedPlayer, playerPositions]);

  const handleRoomClick = (loc: Location) => {
    if (onPlayerMove && loc !== currentPlayerData?.location) {
      onPlayerMove(loc);
    }
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0a0a12]">
      <div
        ref={containerRef}
        className="w-full h-full overflow-auto"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#4a5568 #1a202c' }}
      >
        <div
          className="relative"
          style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
        >
          {/* Background */}
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse at 50% 30%, #1a1a2e 0%, #0d0d1a 40%, #050508 100%)' }}
          />

          {/* Stars */}
          {[...Array(300)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                left: (i * 7919) % MAP_WIDTH,
                top: (i * 6271) % MAP_HEIGHT,
                width: (i % 3) + 1,
                height: (i % 3) + 1,
                opacity: 0.15 + (i % 4) * 0.1,
              }}
            />
          ))}

          {/* Corridors */}
          {CORRIDORS.map((c, i) => (
            <div
              key={`c-${i}`}
              className="absolute rounded-lg"
              style={{
                left: c.x, top: c.y, width: c.width, height: c.height,
                backgroundColor: '#2a2a3a',
                border: '3px solid #1a1a28',
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
              }}
            />
          ))}

          {/* Rooms */}
          {Object.entries(ROOMS).map(([locStr, room]) => {
            const loc = parseInt(locStr) as Location;
            const isCurrent = currentPlayerData?.location === loc;

            return (
              <motion.div
                key={loc}
                className="absolute cursor-pointer rounded-2xl overflow-hidden"
                style={{ left: room.x, top: room.y, width: room.width, height: room.height }}
                onClick={() => handleRoomClick(loc)}
                whileHover={{ scale: 1.008 }}
              >
                {/* Floor */}
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundColor: room.floorColor,
                    border: isCurrent ? '4px solid #fbbf24' : '3px solid #1a1a28',
                    borderRadius: 16,
                    boxShadow: isCurrent
                      ? '0 0 50px rgba(251,191,36,0.4), inset 0 0 40px rgba(0,0,0,0.3)'
                      : 'inset 0 0 40px rgba(0,0,0,0.3)',
                  }}
                />

                {/* Grid */}
                <div
                  className="absolute inset-4 opacity-15"
                  style={{
                    backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                  }}
                />

                {/* Header */}
                <div
                  className="absolute top-0 left-0 right-0 h-14 flex items-center justify-center rounded-t-2xl"
                  style={{ backgroundColor: room.color }}
                >
                  <span className="text-white text-xl font-bold tracking-widest" style={{ textShadow: '2px 2px 6px #000' }}>
                    {room.name}
                  </span>
                </div>

                {/* Decorations */}
                <RoomDecor location={loc} w={room.width} h={room.height} />
              </motion.div>
            );
          })}

          {/* Dead bodies */}
          {deadBodies.filter(b => !b.reported).map((body, i) => {
            const victim = players.find(p => p.address === body.victim);
            const room = ROOMS[body.location];
            return (
              <div
                key={`body-${body.victim}`}
                className="absolute z-20"
                style={{ left: room.center.x - 40 + i * 50, top: room.center.y + 40 }}
              >
                <DeadBodySprite colorId={victim?.colorId || 0} size={80} />
              </div>
            );
          })}

          {/* Players */}
          {players.filter(p => p.isAlive).map(player => {
            const pos = playerPositions[player.address];
            if (!pos) return null;

            const isMe = player.address === currentPlayer;
            const isFollowed = player.address === spotlightedPlayer;

            return (
              <motion.div
                key={player.address}
                className="absolute z-30 cursor-pointer"
                style={{ left: pos.x - 40, top: pos.y - 70 }}
                onClick={e => {
                  e.stopPropagation();
                  onSpotlightPlayer?.(isFollowed ? null : player.address);
                }}
                whileHover={{ scale: 1.1 }}
              >
                {isFollowed && (
                  <motion.div
                    className="absolute -inset-8 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.5) 0%, transparent 70%)' }}
                    animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0.3, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}

                {(isMe || isFollowed) && (
                  <motion.div
                    className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    {isFollowed && (
                      <div className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full mb-1">
                        FOLLOWING
                      </div>
                    )}
                    <svg width="16" height="12" viewBox="0 0 16 12">
                      <path d="M8 12L0 0h16L8 12z" fill={isFollowed ? '#fbbf24' : '#22c55e'} />
                    </svg>
                  </motion.div>
                )}

                <div style={{ transform: pos.facingLeft ? 'scaleX(-1)' : 'scaleX(1)' }}>
                  <AmongUsSprite
                    colorId={player.colorId}
                    size={80}
                    showName
                    name={isMe ? "You" : PlayerColors[player.colorId].name}
                    isMoving={pos.isMoving}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Mini-map */}
      <div className="fixed bottom-4 right-4 w-60 h-48 bg-black/90 rounded-xl border border-gray-700 p-2 z-50">
        <div className="relative w-full h-full">
          {/* Corridors on minimap */}
          {CORRIDORS.map((c, i) => (
            <div
              key={`mc-${i}`}
              className="absolute bg-gray-700 rounded-sm"
              style={{
                left: `${(c.x / MAP_WIDTH) * 100}%`,
                top: `${(c.y / MAP_HEIGHT) * 100}%`,
                width: `${(c.width / MAP_WIDTH) * 100}%`,
                height: `${(c.height / MAP_HEIGHT) * 100}%`,
              }}
            />
          ))}

          {Object.entries(ROOMS).map(([locStr, room]) => {
            const loc = parseInt(locStr) as Location;
            const isFollowed = followedPlayer?.location === loc;
            const isCurrent = currentPlayerData?.location === loc;

            return (
              <div
                key={`mr-${loc}`}
                className="absolute rounded-sm"
                style={{
                  left: `${(room.x / MAP_WIDTH) * 100}%`,
                  top: `${(room.y / MAP_HEIGHT) * 100}%`,
                  width: `${(room.width / MAP_WIDTH) * 100}%`,
                  height: `${(room.height / MAP_HEIGHT) * 100}%`,
                  backgroundColor: isFollowed ? '#fbbf24' : isCurrent ? '#22c55e' : '#4a5568',
                  border: '1px solid #1a1a2e',
                }}
              />
            );
          })}

          {/* Player dots */}
          {players.filter(p => p.isAlive).map(player => {
            const pos = playerPositions[player.address];
            if (!pos) return null;
            return (
              <motion.div
                key={`mp-${player.address}`}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  left: `${(pos.x / MAP_WIDTH) * 100}%`,
                  top: `${(pos.y / MAP_HEIGHT) * 100}%`,
                  backgroundColor: PlayerColors[player.colorId].hex,
                  border: player.address === spotlightedPlayer ? '2px solid #fbbf24' : '1px solid #000',
                  transform: 'translate(-50%, -50%)',
                }}
                animate={pos.isMoving ? { scale: [1, 1.4, 1] } : {}}
                transition={{ duration: 0.4, repeat: Infinity }}
              />
            );
          })}

          <div className="absolute bottom-0 left-0 text-[9px] text-gray-500 font-bold">THE SKELD</div>
        </div>
      </div>

      {/* Follow panel */}
      {spotlightedPlayer && followedPlayer && (
        <motion.div
          className="fixed top-4 left-4 bg-black/90 rounded-xl border-2 border-yellow-500 p-3 z-50"
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
        >
          <div className="flex items-center gap-3">
            <AmongUsSprite colorId={followedPlayer.colorId} size={50} showShadow={false} />
            <div>
              <div className="text-yellow-400 text-[10px] font-bold">FOLLOWING</div>
              <div className="text-white font-bold">{PlayerColors[followedPlayer.colorId].name}</div>
              <div className="text-gray-400 text-xs">{LocationNames[followedPlayer.location]}</div>
              {playerPositions[spotlightedPlayer]?.isMoving && (
                <div className="text-green-400 text-[10px] animate-pulse">● Walking...</div>
              )}
            </div>
            <button
              className="ml-2 w-7 h-7 bg-red-600 hover:bg-red-500 rounded-full text-white font-bold"
              onClick={() => onSpotlightPlayer?.(null)}
            >
              ×
            </button>
          </div>
        </motion.div>
      )}

      <div className="fixed bottom-4 left-4 bg-black/80 rounded-lg px-3 py-2 text-gray-400 text-xs z-50">
        Scroll to explore • Click player to follow • Click room to move
      </div>
    </div>
  );
}

// Clean room decorations - no overlaps
function RoomDecor({ location, w, h }: { location: Location; w: number; h: number }) {
  const cx = w / 2;
  const cy = h / 2 + 10;

  switch (location) {
    case Location.Cafeteria:
      return (
        <div className="absolute inset-0 pt-16 px-8">
          {/* Three tables arranged cleanly */}
          <div className="absolute" style={{ left: cx - 160, top: cy - 20 }}>
            <div className="w-28 h-20 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 border-4 border-blue-800" />
          </div>
          <div className="absolute" style={{ left: cx + 30, top: cy - 20 }}>
            <div className="w-28 h-20 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 border-4 border-blue-800" />
          </div>
          <div className="absolute" style={{ left: cx - 65, top: cy + 70 }}>
            <div className="w-28 h-20 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 border-4 border-blue-800" />
          </div>
          {/* Emergency button */}
          <div className="absolute" style={{ left: cx - 30, top: cy - 10 }}>
            <div className="w-16 h-16 rounded-full bg-gradient-to-b from-gray-400 to-gray-600 border-4 border-gray-700 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-b from-red-500 to-red-700" />
            </div>
          </div>
        </div>
      );

    case Location.Electrical:
      return (
        <div className="absolute inset-0 pt-20 px-8">
          <div className="absolute left-8 top-20 w-20 h-36 bg-gray-700 rounded-lg border-2 border-gray-800 p-2">
            <div className="grid grid-cols-3 gap-1">
              {[...Array(9)].map((_, i) => (
                <div key={i} className={`w-4 h-4 rounded-full ${['bg-red-500', 'bg-green-500', 'bg-yellow-500'][i % 3]}`} />
              ))}
            </div>
          </div>
          <div className="absolute right-8 top-20 w-24 h-32 bg-gray-800 rounded-lg border-2 border-gray-700 p-3">
            <div className="text-gray-400 text-[10px] font-bold mb-2">WIRES</div>
            {['#ef4444', '#3b82f6', '#eab308', '#22c55e'].map((c, i) => (
              <div key={i} className="h-2 my-2 rounded-full" style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      );

    case Location.MedBay:
      return (
        <div className="absolute inset-0 pt-20 px-6">
          <div className="absolute" style={{ left: cx - 45, top: cy - 40 }}>
            <div className="w-24 h-32 bg-teal-800 rounded-xl border-4 border-teal-900 overflow-hidden">
              <motion.div
                className="w-full h-2 bg-teal-400"
                animate={{ y: [0, 120, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            </div>
            <div className="text-teal-400 text-[10px] font-bold text-center mt-1">SCANNER</div>
          </div>
          <div className="absolute left-6 top-24 w-20 h-10 bg-white rounded border-2 border-gray-300" />
          <div className="absolute right-6 top-24 w-20 h-10 bg-white rounded border-2 border-gray-300" />
        </div>
      );

    case Location.Security:
      return (
        <div className="absolute inset-0 pt-20">
          <div className="absolute left-1/2 -translate-x-1/2 top-20 flex gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-14 h-12 bg-gray-900 rounded border-2 border-gray-700">
                <div className="w-full h-full bg-gradient-to-br from-green-900/50 to-transparent rounded" />
              </div>
            ))}
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 top-40 w-12 h-12 bg-gray-700 rounded-full border-4 border-gray-800" />
        </div>
      );

    case Location.UpperEngine:
    case Location.LowerEngine:
      return (
        <div className="absolute inset-0 flex items-center justify-center pt-6">
          <motion.div
            className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-400 to-red-700 border-6 border-gray-800"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <div className="w-full h-full rounded-full bg-gradient-to-br from-yellow-400/50 to-transparent" />
          </motion.div>
        </div>
      );

    case Location.Reactor:
      return (
        <div className="absolute inset-0 flex items-center justify-center pt-6">
          <div className="w-44 h-28 bg-gray-800 rounded-xl border-4 border-gray-900 flex items-center justify-center">
            <motion.div
              className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 border-4 border-cyan-800"
              animate={{ boxShadow: ['0 0 15px #06b6d4', '0 0 40px #06b6d4', '0 0 15px #06b6d4'] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
        </div>
      );

    case Location.Admin:
      return (
        <div className="absolute inset-0 flex items-center justify-center pt-6">
          <div className="w-44 h-32 bg-gray-700 rounded-xl border-4 border-gray-800 flex items-center justify-center">
            <div className="w-36 h-24 bg-green-950 rounded border-2 border-green-800 flex items-center justify-center">
              <span className="text-green-400 text-sm font-bold">ADMIN MAP</span>
            </div>
          </div>
        </div>
      );

    case Location.Storage:
      return (
        <div className="absolute inset-0 pt-20 px-6">
          {/* Crates - positioned to not overlap */}
          <div className="absolute left-8 top-24 w-20 h-20 bg-amber-700 rounded border-4 border-amber-900" />
          <div className="absolute right-8 top-24 w-20 h-20 bg-amber-700 rounded border-4 border-amber-900" />
          <div className="absolute left-8 bottom-24 w-20 h-20 bg-amber-700 rounded border-4 border-amber-900" />
          <div className="absolute right-8 bottom-24 w-20 h-20 bg-amber-700 rounded border-4 border-amber-900" />
          {/* Fuel can in center */}
          <div className="absolute" style={{ left: cx - 25, top: cy + 10 }}>
            <div className="w-14 h-22 bg-red-700 rounded-lg border-4 border-red-900 flex items-end justify-center pb-1">
              <span className="text-white text-[9px] font-bold">FUEL</span>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}
