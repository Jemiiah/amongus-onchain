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

const MAP_WIDTH = 5000;
const MAP_HEIGHT = 4200;

// Corridor floor details - arrows, lines, hazard stripes
function CorridorDetails({ x, y, width, height, direction }: { x: number; y: number; width: number; height: number; direction: 'horizontal' | 'vertical' }) {
  const isHorizontal = direction === 'horizontal';

  return (
    <div className="absolute pointer-events-none" style={{ left: x, top: y, width, height }}>
      {/* Center line */}
      <div
        className="absolute bg-yellow-500/40"
        style={isHorizontal ? {
          left: 10, right: 10, top: '50%', height: 3, transform: 'translateY(-50%)',
          boxShadow: '0 0 8px rgba(234, 179, 8, 0.3)'
        } : {
          top: 10, bottom: 10, left: '50%', width: 3, transform: 'translateX(-50%)',
          boxShadow: '0 0 8px rgba(234, 179, 8, 0.3)'
        }}
      />
      {/* Dashed edge lines */}
      <div
        className="absolute"
        style={isHorizontal ? {
          left: 8, right: 8, top: 8, height: 2,
          backgroundImage: 'repeating-linear-gradient(90deg, #64748b 0, #64748b 10px, transparent 10px, transparent 20px)'
        } : {
          top: 8, bottom: 8, left: 8, width: 2,
          backgroundImage: 'repeating-linear-gradient(180deg, #64748b 0, #64748b 10px, transparent 10px, transparent 20px)'
        }}
      />
      <div
        className="absolute"
        style={isHorizontal ? {
          left: 8, right: 8, bottom: 8, height: 2,
          backgroundImage: 'repeating-linear-gradient(90deg, #64748b 0, #64748b 10px, transparent 10px, transparent 20px)'
        } : {
          top: 8, bottom: 8, right: 8, width: 2,
          backgroundImage: 'repeating-linear-gradient(180deg, #64748b 0, #64748b 10px, transparent 10px, transparent 20px)'
        }}
      />
      {/* Floor grating pattern */}
      <div
        className="absolute inset-4 opacity-20"
        style={{
          backgroundImage: isHorizontal
            ? 'repeating-linear-gradient(90deg, #1a1a2e 0, #1a1a2e 2px, transparent 2px, transparent 12px)'
            : 'repeating-linear-gradient(180deg, #1a1a2e 0, #1a1a2e 2px, transparent 2px, transparent 12px)'
        }}
      />
    </div>
  );
}

// Pipe decoration along corridors
function CorridorPipes({ x, y, width, height, direction }: { x: number; y: number; width: number; height: number; direction: 'horizontal' | 'vertical' }) {
  const isHorizontal = direction === 'horizontal';

  return (
    <>
      {/* Main pipe */}
      <div
        className="absolute rounded-full"
        style={{
          left: isHorizontal ? x : x - 6,
          top: isHorizontal ? y - 6 : y,
          width: isHorizontal ? width : 8,
          height: isHorizontal ? 8 : height,
          background: 'linear-gradient(to bottom, #6b7280, #374151, #6b7280)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
        }}
      />
      {/* Secondary pipe with color */}
      <div
        className="absolute rounded-full"
        style={{
          left: isHorizontal ? x : x + width + 2,
          top: isHorizontal ? y + height + 2 : y,
          width: isHorizontal ? width : 6,
          height: isHorizontal ? 6 : height,
          background: 'linear-gradient(to bottom, #f59e0b, #d97706, #f59e0b)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
        }}
      />
    </>
  );
}

// Vent grate decoration
function VentGrate({ x, y, size = 40 }: { x: number; y: number; size?: number }) {
  return (
    <div
      className="absolute"
      style={{ left: x, top: y, width: size, height: size * 0.6 }}
    >
      <div className="w-full h-full bg-gray-800 rounded border-2 border-gray-900 overflow-hidden">
        <div className="w-full h-full" style={{
          backgroundImage: 'repeating-linear-gradient(90deg, #1f2937 0, #1f2937 3px, #374151 3px, #374151 6px)'
        }} />
      </div>
      {/* Screws */}
      <div className="absolute w-2 h-2 bg-gray-600 rounded-full top-1 left-1 border border-gray-800" />
      <div className="absolute w-2 h-2 bg-gray-600 rounded-full top-1 right-1 border border-gray-800" />
    </div>
  );
}

// Wall light fixture
function WallLight({ x, y, color = '#3b82f6' }: { x: number; y: number; color?: string }) {
  return (
    <motion.div
      className="absolute"
      style={{ left: x, top: y }}
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <div className="w-4 h-8 rounded-full" style={{
        background: `linear-gradient(180deg, ${color} 0%, ${color}88 50%, ${color}44 100%)`,
        boxShadow: `0 0 15px ${color}, 0 0 30px ${color}66`
      }} />
    </motion.div>
  );
}

// Space window decoration
function SpaceWindow({ x, y, width = 60, height = 80 }: { x: number; y: number; width?: number; height?: number }) {
  return (
    <div
      className="absolute overflow-hidden"
      style={{
        left: x, top: y, width, height,
        background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 50%, #0a0a1a 100%)',
        borderRadius: 8,
        border: '4px solid #374151',
        boxShadow: 'inset 0 0 20px rgba(59, 130, 246, 0.3), 0 0 10px rgba(0,0,0,0.8)'
      }}
    >
      {/* Stars through window */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute bg-white rounded-full"
          style={{
            left: `${(i * 37) % 90}%`,
            top: `${(i * 53) % 90}%`,
            width: 2,
            height: 2,
          }}
          animate={{ opacity: [0.3, 0.9, 0.3] }}
          transition={{ duration: 1 + (i % 3), repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
      {/* Window frame inner border */}
      <div className="absolute inset-1 rounded border border-gray-600/50" />
    </div>
  );
}

// Hull panel decoration
function HullPanel({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
  return (
    <div
      className="absolute"
      style={{
        left: x, top: y, width, height,
        background: 'linear-gradient(180deg, #374151 0%, #1f2937 100%)',
        borderRadius: 4,
        border: '2px solid #4b5563',
        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.3)'
      }}
    >
      {/* Rivets */}
      <div className="absolute w-2 h-2 bg-gray-500 rounded-full top-1 left-1" />
      <div className="absolute w-2 h-2 bg-gray-500 rounded-full top-1 right-1" />
      <div className="absolute w-2 h-2 bg-gray-500 rounded-full bottom-1 left-1" />
      <div className="absolute w-2 h-2 bg-gray-500 rounded-full bottom-1 right-1" />
    </div>
  );
}

// Hazard stripe pattern
function HazardStripes({ x, y, width, height, direction = 'horizontal' }: { x: number; y: number; width: number; height: number; direction?: 'horizontal' | 'vertical' }) {
  return (
    <div
      className="absolute"
      style={{
        left: x, top: y, width, height,
        background: direction === 'horizontal'
          ? 'repeating-linear-gradient(45deg, #eab308 0, #eab308 10px, #1f2937 10px, #1f2937 20px)'
          : 'repeating-linear-gradient(-45deg, #eab308 0, #eab308 10px, #1f2937 10px, #1f2937 20px)',
        borderRadius: 2,
      }}
    />
  );
}

// Room configurations - MUCH LARGER layout with proper spacing
// The Skeld Layout:
//   Upper Engine ---- MedBay ---- Cafeteria
//        |                            |
//     Reactor                       Admin
//        |                            |
//    Security                      Storage
//        |                            |
//   Lower Engine -- Electrical -------+
//
const ROOMS: Record<Location, {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  floorColor: string;
  name: string;
  entryPoints: { [key: string]: { x: number; y: number } };
  center: { x: number; y: number };
}> = {
  // === TOP ROW ===
  [Location.UpperEngine]: {
    x: 100, y: 100,
    width: 650, height: 550,
    color: "#5a3a3a", floorColor: "#6a4a4a",
    name: "UPPER ENGINE",
    center: { x: 425, y: 400 },
    entryPoints: {
      right: { x: 750, y: 400 },
      bottom: { x: 425, y: 650 },
    },
  },
  [Location.MedBay]: {
    x: 950, y: 100,
    width: 650, height: 550,
    color: "#3a5a4a", floorColor: "#4a6a5a",
    name: "MEDBAY",
    center: { x: 1275, y: 400 },
    entryPoints: {
      left: { x: 950, y: 400 },
      right: { x: 1600, y: 400 },
    },
  },
  [Location.Cafeteria]: {
    x: 1800, y: 100,
    width: 900, height: 550,
    color: "#4a5568", floorColor: "#5a6578",
    name: "CAFETERIA",
    center: { x: 2250, y: 400 },
    entryPoints: {
      left: { x: 1800, y: 400 },
      bottom: { x: 2250, y: 650 },
    },
  },
  // === SECOND ROW ===
  [Location.Reactor]: {
    x: 100, y: 850,
    width: 650, height: 500,
    color: "#5a4a3a", floorColor: "#6a5a4a",
    name: "REACTOR",
    center: { x: 425, y: 1120 },
    entryPoints: {
      top: { x: 425, y: 850 },
      bottom: { x: 425, y: 1350 },
    },
  },
  [Location.Admin]: {
    x: 2000, y: 850,
    width: 700, height: 500,
    color: "#4a5568", floorColor: "#5a6578",
    name: "ADMIN",
    center: { x: 2350, y: 1120 },
    entryPoints: {
      top: { x: 2350, y: 850 },
      bottom: { x: 2350, y: 1350 },
    },
  },
  // === THIRD ROW ===
  [Location.Security]: {
    x: 100, y: 1550,
    width: 650, height: 500,
    color: "#3a3a5a", floorColor: "#4a4a6a",
    name: "SECURITY",
    center: { x: 425, y: 1820 },
    entryPoints: {
      top: { x: 425, y: 1550 },
      bottom: { x: 425, y: 2050 },
    },
  },
  [Location.Storage]: {
    x: 1800, y: 1550,
    width: 900, height: 550,
    color: "#5a4a3a", floorColor: "#6a5a4a",
    name: "STORAGE",
    center: { x: 2250, y: 1850 },
    entryPoints: {
      top: { x: 2250, y: 1550 },
      left: { x: 1800, y: 1850 },
    },
  },
  // === BOTTOM ROW ===
  [Location.LowerEngine]: {
    x: 100, y: 2300,
    width: 650, height: 550,
    color: "#5a3a3a", floorColor: "#6a4a4a",
    name: "LOWER ENGINE",
    center: { x: 425, y: 2600 },
    entryPoints: {
      top: { x: 425, y: 2300 },
      right: { x: 750, y: 2600 },
    },
  },
  [Location.Electrical]: {
    x: 950, y: 2300,
    width: 650, height: 550,
    color: "#3a4a5a", floorColor: "#4a5a6a",
    name: "ELECTRICAL",
    center: { x: 1275, y: 2600 },
    entryPoints: {
      left: { x: 950, y: 2600 },
      right: { x: 1600, y: 2600 },
    },
  },
};

// Corridor definitions - matches The Skeld layout
const CORRIDORS: { x: number; y: number; width: number; height: number; direction: 'horizontal' | 'vertical' }[] = [
  // === TOP HORIZONTAL CORRIDOR ===
  // Upper Engine (right edge x=750) to MedBay (left edge x=950)
  { x: 750, y: 350, width: 200, height: 120, direction: 'horizontal' },
  // MedBay (right edge x=1600) to Cafeteria (left edge x=1800)
  { x: 1600, y: 350, width: 200, height: 120, direction: 'horizontal' },

  // === LEFT VERTICAL CORRIDOR (Engine Column) ===
  // Upper Engine (bottom y=650) to Reactor (top y=850)
  { x: 370, y: 650, width: 120, height: 200, direction: 'vertical' },
  // Reactor (bottom y=1350) to Security (top y=1550)
  { x: 370, y: 1350, width: 120, height: 200, direction: 'vertical' },
  // Security (bottom y=2050) to Lower Engine (top y=2300)
  { x: 370, y: 2050, width: 120, height: 250, direction: 'vertical' },

  // === RIGHT VERTICAL CORRIDOR ===
  // Cafeteria (bottom y=650) to Admin (top y=850)
  { x: 2200, y: 650, width: 120, height: 200, direction: 'vertical' },
  // Admin (bottom y=1350) to Storage (top y=1550)
  { x: 2200, y: 1350, width: 120, height: 200, direction: 'vertical' },

  // === BOTTOM HORIZONTAL CORRIDOR ===
  // Lower Engine (right edge x=750) to Electrical (left edge x=950)
  { x: 750, y: 2550, width: 200, height: 120, direction: 'horizontal' },
  // Electrical (right edge x=1600) to Storage (left edge x=1800)
  { x: 1600, y: 2550, width: 200, height: 120, direction: 'horizontal' },
  // Connect bottom corridor to Storage (going up)
  { x: 1750, y: 2100, width: 120, height: 500, direction: 'vertical' },
];

// Vent locations on the map - positioned for The Skeld layout
const VENTS = [
  { x: 600, y: 500 },   // Upper Engine
  { x: 1400, y: 500 },  // MedBay
  { x: 600, y: 1200 },  // Reactor
  { x: 600, y: 1900 },  // Security
  { x: 600, y: 2700 },  // Lower Engine
  { x: 1400, y: 2700 }, // Electrical
  { x: 2400, y: 1200 }, // Admin
  { x: 2400, y: 1950 }, // Storage
];

// Wall lights for ambiance - positioned for The Skeld layout
const WALL_LIGHTS = [
  // Top row
  { x: 80, y: 200, color: '#ef4444' },    // Upper Engine
  { x: 930, y: 200, color: '#22c55e' },   // MedBay
  { x: 1780, y: 200, color: '#3b82f6' },  // Cafeteria
  { x: 2680, y: 200, color: '#3b82f6' },  // Cafeteria right
  // Second row
  { x: 80, y: 950, color: '#f59e0b' },    // Reactor
  { x: 2680, y: 950, color: '#22c55e' },  // Admin
  // Third row
  { x: 80, y: 1650, color: '#a855f7' },   // Security
  { x: 2680, y: 1650, color: '#a855f7' }, // Storage
  // Bottom row
  { x: 80, y: 2400, color: '#ef4444' },   // Lower Engine
  { x: 930, y: 2400, color: '#3b82f6' },  // Electrical
];

// Space windows on the hull - positioned for The Skeld layout
const SPACE_WINDOWS = [
  // Left side
  { x: 30, y: 250, width: 55, height: 80 },   // Upper Engine
  { x: 30, y: 1000, width: 55, height: 80 },  // Reactor
  { x: 30, y: 1700, width: 55, height: 80 },  // Security
  { x: 30, y: 2450, width: 55, height: 80 },  // Lower Engine
  // Right side
  { x: 2800, y: 250, width: 55, height: 80 },  // Cafeteria
  { x: 2800, y: 1000, width: 55, height: 80 }, // Admin
  { x: 2800, y: 1700, width: 55, height: 80 }, // Storage
];

// Graph of connected rooms with corridor waypoints - The Skeld layout
// Connections match types/game.ts RoomConnections
const ROOM_CONNECTIONS: Record<Location, { to: Location; path: { x: number; y: number }[] }[]> = {
  [Location.UpperEngine]: [
    // Upper Engine → MedBay (horizontal right)
    { to: Location.MedBay, path: [{ x: 750, y: 400 }, { x: 850, y: 400 }, { x: 950, y: 400 }] },
    // Upper Engine → Reactor (vertical down)
    { to: Location.Reactor, path: [{ x: 425, y: 650 }, { x: 425, y: 750 }, { x: 425, y: 850 }] },
  ],
  [Location.MedBay]: [
    // MedBay → Upper Engine (horizontal left)
    { to: Location.UpperEngine, path: [{ x: 950, y: 400 }, { x: 850, y: 400 }, { x: 750, y: 400 }] },
    // MedBay → Cafeteria (horizontal right)
    { to: Location.Cafeteria, path: [{ x: 1600, y: 400 }, { x: 1700, y: 400 }, { x: 1800, y: 400 }] },
  ],
  [Location.Cafeteria]: [
    // Cafeteria → MedBay (horizontal left)
    { to: Location.MedBay, path: [{ x: 1800, y: 400 }, { x: 1700, y: 400 }, { x: 1600, y: 400 }] },
    // Cafeteria → Admin (vertical down)
    { to: Location.Admin, path: [{ x: 2250, y: 650 }, { x: 2250, y: 750 }, { x: 2350, y: 850 }] },
  ],
  [Location.Reactor]: [
    // Reactor → Upper Engine (vertical up)
    { to: Location.UpperEngine, path: [{ x: 425, y: 850 }, { x: 425, y: 750 }, { x: 425, y: 650 }] },
    // Reactor → Security (vertical down)
    { to: Location.Security, path: [{ x: 425, y: 1350 }, { x: 425, y: 1450 }, { x: 425, y: 1550 }] },
  ],
  [Location.Admin]: [
    // Admin → Cafeteria (vertical up)
    { to: Location.Cafeteria, path: [{ x: 2350, y: 850 }, { x: 2250, y: 750 }, { x: 2250, y: 650 }] },
    // Admin → Storage (vertical down)
    { to: Location.Storage, path: [{ x: 2350, y: 1350 }, { x: 2350, y: 1450 }, { x: 2250, y: 1550 }] },
  ],
  [Location.Security]: [
    // Security → Reactor (vertical up)
    { to: Location.Reactor, path: [{ x: 425, y: 1550 }, { x: 425, y: 1450 }, { x: 425, y: 1350 }] },
    // Security → Lower Engine (vertical down)
    { to: Location.LowerEngine, path: [{ x: 425, y: 2050 }, { x: 425, y: 2175 }, { x: 425, y: 2300 }] },
  ],
  [Location.Storage]: [
    // Storage → Admin (vertical up)
    { to: Location.Admin, path: [{ x: 2250, y: 1550 }, { x: 2350, y: 1450 }, { x: 2350, y: 1350 }] },
    // Storage → Electrical (horizontal left, going down then left)
    { to: Location.Electrical, path: [{ x: 1800, y: 1850 }, { x: 1750, y: 2200 }, { x: 1600, y: 2600 }] },
  ],
  [Location.LowerEngine]: [
    // Lower Engine → Security (vertical up)
    { to: Location.Security, path: [{ x: 425, y: 2300 }, { x: 425, y: 2175 }, { x: 425, y: 2050 }] },
    // Lower Engine → Electrical (horizontal right)
    { to: Location.Electrical, path: [{ x: 750, y: 2600 }, { x: 850, y: 2600 }, { x: 950, y: 2600 }] },
  ],
  [Location.Electrical]: [
    // Electrical → Lower Engine (horizontal left)
    { to: Location.LowerEngine, path: [{ x: 950, y: 2600 }, { x: 850, y: 2600 }, { x: 750, y: 2600 }] },
    // Electrical → Storage (horizontal right, going up then right)
    { to: Location.Storage, path: [{ x: 1600, y: 2600 }, { x: 1750, y: 2200 }, { x: 1800, y: 1850 }] },
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

  // Handle room changes and clean up dead players
  useEffect(() => {
    // Only process alive players
    const alivePlayers = players.filter(p => p.isAlive);

    alivePlayers.forEach((player, idx) => {
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

    // Clean up positions for dead players
    const deadPlayers = players.filter(p => !p.isAlive);
    if (deadPlayers.length > 0) {
      setPlayerPositions(prev => {
        const next = { ...prev };
        deadPlayers.forEach(dp => {
          delete next[dp.address];
        });
        return next;
      });
    }

    const newLocs: Record<string, Location> = {};
    alivePlayers.forEach(p => newLocs[p.address] = p.location);
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

          {/* Stars - varied sizes and twinkle */}
          {[...Array(400)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                left: (i * 7919) % MAP_WIDTH,
                top: (i * 6271) % MAP_HEIGHT,
                width: (i % 4) + 1,
                height: (i % 4) + 1,
                backgroundColor: i % 10 === 0 ? '#fef3c7' : i % 7 === 0 ? '#bfdbfe' : '#ffffff',
              }}
              animate={i % 5 === 0 ? { opacity: [0.2, 0.8, 0.2] } : { opacity: 0.15 + (i % 4) * 0.12 }}
              transition={i % 5 === 0 ? { duration: 1.5 + (i % 3), repeat: Infinity } : undefined}
            />
          ))}

          {/* Distant nebula effects */}
          <div
            className="absolute rounded-full opacity-10 blur-3xl"
            style={{
              left: 500, top: 300, width: 600, height: 400,
              background: 'radial-gradient(ellipse, #7c3aed 0%, transparent 70%)'
            }}
          />
          <div
            className="absolute rounded-full opacity-10 blur-3xl"
            style={{
              left: 1800, top: 1000, width: 500, height: 500,
              background: 'radial-gradient(ellipse, #06b6d4 0%, transparent 70%)'
            }}
          />
          <div
            className="absolute rounded-full opacity-8 blur-3xl"
            style={{
              left: 200, top: 1400, width: 400, height: 300,
              background: 'radial-gradient(ellipse, #f43f5e 0%, transparent 70%)'
            }}
          />

          {/* Space windows on hull edges */}
          {SPACE_WINDOWS.map((w, i) => (
            <SpaceWindow key={`sw-${i}`} x={w.x} y={w.y} width={w.width} height={w.height} />
          ))}

          {/* Hull panels decoration */}
          <HullPanel x={100} y={50} width={80} height={40} />
          <HullPanel x={2700} y={50} width={80} height={40} />
          <HullPanel x={100} y={3000} width={80} height={40} />
          <HullPanel x={2700} y={3000} width={80} height={40} />

          {/* Corridors - base layer */}
          {CORRIDORS.map((c, i) => (
            <div
              key={`c-${i}`}
              className="absolute rounded-lg overflow-hidden"
              style={{
                left: c.x, top: c.y, width: c.width, height: c.height,
                backgroundColor: '#252535',
                border: '4px solid #1a1a28',
                boxShadow: 'inset 0 0 30px rgba(0,0,0,0.6), 0 4px 8px rgba(0,0,0,0.4)',
              }}
            >
              {/* Floor tiles pattern */}
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: c.direction === 'horizontal'
                    ? 'repeating-linear-gradient(90deg, #1a1a2e 0, #1a1a2e 1px, transparent 1px, transparent 30px), repeating-linear-gradient(0deg, #1a1a2e 0, #1a1a2e 1px, transparent 1px, transparent 30px)'
                    : 'repeating-linear-gradient(90deg, #1a1a2e 0, #1a1a2e 1px, transparent 1px, transparent 30px), repeating-linear-gradient(0deg, #1a1a2e 0, #1a1a2e 1px, transparent 1px, transparent 30px)',
                  backgroundSize: '30px 30px'
                }}
              />
              {/* Subtle lighting gradient */}
              <div
                className="absolute inset-0"
                style={{
                  background: c.direction === 'horizontal'
                    ? 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.1) 100%)'
                    : 'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.1) 100%)'
                }}
              />
            </div>
          ))}

          {/* Corridor floor details (arrows, lines) */}
          {CORRIDORS.map((c, i) => (
            <CorridorDetails key={`cd-${i}`} x={c.x} y={c.y} width={c.width} height={c.height} direction={c.direction} />
          ))}

          {/* Corridor pipes */}
          {CORRIDORS.map((c, i) => (
            <CorridorPipes key={`cp-${i}`} x={c.x} y={c.y} width={c.width} height={c.height} direction={c.direction} />
          ))}

          {/* Vents */}
          {VENTS.map((v, i) => (
            <VentGrate key={`v-${i}`} x={v.x} y={v.y} size={50} />
          ))}

          {/* Wall lights */}
          {WALL_LIGHTS.map((l, i) => (
            <WallLight key={`wl-${i}`} x={l.x} y={l.y} color={l.color} />
          ))}

          {/* Hazard stripes near dangerous areas (Reactor at y=2420) */}
          <HazardStripes x={350} y={2400} width={200} height={18} />
          <HazardStripes x={80} y={2400} width={18} height={120} direction="vertical" />
          <HazardStripes x={780} y={2400} width={18} height={120} direction="vertical" />

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
                {/* Room outer glow when current */}
                {isCurrent && (
                  <motion.div
                    className="absolute -inset-2 rounded-3xl pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse, rgba(251,191,36,0.3) 0%, transparent 70%)' }}
                    animate={{ opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}

                {/* Floor base with gradient */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(180deg, ${room.floorColor} 0%, ${room.color} 100%)`,
                    border: isCurrent ? '5px solid #fbbf24' : '4px solid #1a1a28',
                    borderRadius: 16,
                    boxShadow: isCurrent
                      ? '0 0 60px rgba(251,191,36,0.5), inset 0 0 50px rgba(0,0,0,0.4)'
                      : '0 8px 32px rgba(0,0,0,0.4), inset 0 0 50px rgba(0,0,0,0.4)',
                  }}
                />

                {/* Floor tile pattern */}
                <div
                  className="absolute inset-4 opacity-20"
                  style={{
                    backgroundImage: 'linear-gradient(rgba(0,0,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.3) 1px, transparent 1px)',
                    backgroundSize: '35px 35px',
                  }}
                />

                {/* Floor shine effect */}
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)',
                    borderRadius: 12,
                  }}
                />

                {/* Header with better styling */}
                <div
                  className="absolute top-0 left-0 right-0 h-14 flex items-center justify-center rounded-t-xl overflow-hidden"
                  style={{
                    background: `linear-gradient(180deg, ${room.color} 0%, ${room.color}dd 100%)`,
                    borderBottom: '3px solid rgba(0,0,0,0.3)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                  }}
                >
                  {/* Header shine */}
                  <div className="absolute inset-0 opacity-20" style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 50%)'
                  }} />
                  <span className="text-white text-xl font-black tracking-widest relative" style={{
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)',
                    letterSpacing: '0.15em'
                  }}>
                    {room.name}
                  </span>
                </div>

                {/* Corner accents */}
                <div className="absolute bottom-2 left-2 w-8 h-8 border-l-3 border-b-3 border-gray-600/30 rounded-bl-lg" />
                <div className="absolute bottom-2 right-2 w-8 h-8 border-r-3 border-b-3 border-gray-600/30 rounded-br-lg" />

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
      <div className="fixed bottom-4 right-4 w-64 h-52 bg-gradient-to-b from-gray-900 to-black rounded-xl border-2 border-gray-600 p-2 z-50" style={{
        boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.5)'
      }}>
        {/* Mini-map header */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-800 px-3 py-0.5 rounded-full border border-gray-600">
          <span className="text-[10px] text-cyan-400 font-bold tracking-wider">RADAR</span>
        </div>

        <div className="relative w-full h-full mt-1">
          {/* Scan line effect */}
          <motion.div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              background: 'linear-gradient(180deg, transparent 0%, rgba(34, 197, 94, 0.3) 50%, transparent 100%)',
              height: '30%'
            }}
            animate={{ y: ['0%', '250%', '0%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />

          {/* Corridors on minimap */}
          {CORRIDORS.map((c, i) => (
            <div
              key={`mc-${i}`}
              className="absolute bg-gray-700/80 rounded-sm"
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
              <motion.div
                key={`mr-${loc}`}
                className="absolute rounded"
                style={{
                  left: `${(room.x / MAP_WIDTH) * 100}%`,
                  top: `${(room.y / MAP_HEIGHT) * 100}%`,
                  width: `${(room.width / MAP_WIDTH) * 100}%`,
                  height: `${(room.height / MAP_HEIGHT) * 100}%`,
                  backgroundColor: isFollowed ? '#fbbf24' : isCurrent ? '#22c55e' : '#4b5563',
                  border: isFollowed ? '2px solid #fbbf24' : isCurrent ? '2px solid #22c55e' : '1px solid #374151',
                  boxShadow: isFollowed || isCurrent ? `0 0 8px ${isFollowed ? '#fbbf24' : '#22c55e'}` : 'none'
                }}
                animate={isFollowed ? { opacity: [0.7, 1, 0.7] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              />
            );
          })}

          {/* Player dots with glow */}
          {players.filter(p => p.isAlive).map(player => {
            const pos = playerPositions[player.address];
            if (!pos) return null;
            const isSpotlighted = player.address === spotlightedPlayer;
            return (
              <motion.div
                key={`mp-${player.address}`}
                className="absolute rounded-full"
                style={{
                  left: `${(pos.x / MAP_WIDTH) * 100}%`,
                  top: `${(pos.y / MAP_HEIGHT) * 100}%`,
                  width: isSpotlighted ? 10 : 8,
                  height: isSpotlighted ? 10 : 8,
                  backgroundColor: PlayerColors[player.colorId].hex,
                  border: isSpotlighted ? '2px solid #fbbf24' : '1px solid #000',
                  transform: 'translate(-50%, -50%)',
                  boxShadow: `0 0 6px ${PlayerColors[player.colorId].hex}`
                }}
                animate={pos.isMoving ? { scale: [1, 1.4, 1] } : {}}
                transition={{ duration: 0.4, repeat: Infinity }}
              />
            );
          })}

          {/* Dead body indicators */}
          {deadBodies.filter(b => !b.reported).map((body, i) => {
            const room = ROOMS[body.location];
            return (
              <motion.div
                key={`mb-${i}`}
                className="absolute w-2 h-2 bg-red-600 rounded-full"
                style={{
                  left: `${((room.center.x + i * 20) / MAP_WIDTH) * 100}%`,
                  top: `${((room.center.y + 20) / MAP_HEIGHT) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
            );
          })}

          {/* Ship label */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between items-end px-1">
            <span className="text-[9px] text-gray-500 font-bold tracking-wider">THE SKELD</span>
            <span className="text-[8px] text-gray-600">MIRA HQ</span>
          </div>
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

// Detailed cartoonish room decorations
function RoomDecor({ location, w, h }: { location: Location; w: number; h: number }) {
  const cx = w / 2;
  const cy = h / 2 + 20;

  switch (location) {
    case Location.Cafeteria:
      return (
        <div className="absolute inset-0 pt-16 px-8">
          {/* Checkered floor pattern */}
          <div className="absolute inset-0 top-14 opacity-20" style={{
            backgroundImage: 'repeating-conic-gradient(#374151 0% 25%, #4b5563 0% 50%)',
            backgroundSize: '40px 40px'
          }} />

          {/* Three oval tables with chairs */}
          {[
            { x: cx - 170, y: cy - 40 },
            { x: cx + 40, y: cy - 40 },
            { x: cx - 65, y: cy + 80 }
          ].map((pos, i) => (
            <div key={i} className="absolute" style={{ left: pos.x, top: pos.y }}>
              {/* Table */}
              <div className="w-32 h-22 rounded-full bg-gradient-to-b from-blue-300 to-blue-500 border-4 border-blue-700 shadow-lg" style={{
                boxShadow: '0 8px 16px rgba(0,0,0,0.4), inset 0 -4px 8px rgba(0,0,0,0.2), inset 0 4px 8px rgba(255,255,255,0.3)'
              }}>
                {/* Table shine */}
                <div className="absolute top-2 left-4 w-8 h-4 bg-white/30 rounded-full blur-sm" />
              </div>
              {/* Chairs around table */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-6 h-6 bg-gradient-to-b from-gray-400 to-gray-600 rounded-full border-2 border-gray-700" />
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-6 h-6 bg-gradient-to-b from-gray-400 to-gray-600 rounded-full border-2 border-gray-700" />
              <div className="absolute top-1/2 -left-4 -translate-y-1/2 w-6 h-6 bg-gradient-to-b from-gray-400 to-gray-600 rounded-full border-2 border-gray-700" />
              <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-6 h-6 bg-gradient-to-b from-gray-400 to-gray-600 rounded-full border-2 border-gray-700" />
            </div>
          ))}

          {/* Emergency button pedestal */}
          <div className="absolute" style={{ left: cx - 40, top: cy - 20 }}>
            <div className="w-20 h-6 bg-gradient-to-b from-gray-500 to-gray-700 rounded-sm border-2 border-gray-800" />
            <div className="w-18 h-18 -mt-1 mx-auto bg-gradient-to-b from-gray-400 to-gray-600 rounded-lg border-4 border-gray-700 flex items-center justify-center" style={{
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
            }}>
              <motion.div
                className="w-12 h-12 rounded-full border-4 border-red-900 flex items-center justify-center"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, #ef4444 0%, #b91c1c 100%)',
                  boxShadow: '0 0 20px rgba(239, 68, 68, 0.5), inset 0 -4px 8px rgba(0,0,0,0.3), inset 0 4px 8px rgba(255,255,255,0.3)'
                }}
                animate={{ boxShadow: ['0 0 20px rgba(239, 68, 68, 0.5)', '0 0 35px rgba(239, 68, 68, 0.8)', '0 0 20px rgba(239, 68, 68, 0.5)'] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <span className="text-white text-[8px] font-black">!</span>
              </motion.div>
            </div>
            <div className="text-gray-300 text-[10px] font-bold text-center mt-2">EMERGENCY</div>
          </div>

          {/* Vending machine */}
          <div className="absolute right-10 top-20 w-16 h-28 bg-gradient-to-b from-red-600 to-red-800 rounded-lg border-3 border-red-900" style={{
            boxShadow: '4px 4px 12px rgba(0,0,0,0.4)'
          }}>
            <div className="w-12 h-16 mx-auto mt-2 bg-gray-900 rounded border border-gray-700" />
            <div className="flex justify-center gap-1 mt-2">
              <div className="w-3 h-3 bg-yellow-400 rounded-full" />
              <div className="w-3 h-3 bg-green-400 rounded-full" />
            </div>
          </div>

          {/* Trash can */}
          <div className="absolute left-10 bottom-20 w-10 h-14 bg-gradient-to-b from-gray-500 to-gray-700 rounded-b-lg border-2 border-gray-800">
            <div className="w-12 h-2 -ml-1 bg-gray-600 rounded-t-lg border-2 border-gray-800" />
          </div>
        </div>
      );

    case Location.Electrical:
      return (
        <div className="absolute inset-0 pt-20 px-6">
          {/* Dark floor with cable channels */}
          <div className="absolute inset-0 top-14 opacity-30" style={{
            backgroundImage: 'linear-gradient(90deg, #1f2937 0px, #1f2937 2px, transparent 2px, transparent 20px)',
            backgroundSize: '20px 100%'
          }} />

          {/* Main electrical panel with lights */}
          <div className="absolute left-6 top-20 w-24 h-44 bg-gradient-to-b from-gray-600 to-gray-800 rounded-lg border-4 border-gray-900" style={{
            boxShadow: '4px 4px 16px rgba(0,0,0,0.5)'
          }}>
            <div className="text-gray-400 text-[9px] font-bold text-center mt-1">POWER GRID</div>
            <div className="grid grid-cols-4 gap-1 p-2 mt-1">
              {[...Array(16)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-4 h-4 rounded-full border border-gray-900"
                  style={{ backgroundColor: ['#ef4444', '#22c55e', '#eab308', '#3b82f6'][i % 4] }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.5 + (i % 3) * 0.3, repeat: Infinity, delay: i * 0.1 }}
                />
              ))}
            </div>
            {/* Switches */}
            <div className="flex justify-center gap-2 mt-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-4 h-8 bg-gray-700 rounded border border-gray-900">
                  <div className="w-3 h-3 mx-auto mt-1 bg-gray-500 rounded-sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Wire panel */}
          <div className="absolute right-6 top-20 w-28 h-40 bg-gray-900 rounded-lg border-4 border-gray-700 overflow-hidden" style={{
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
          }}>
            <div className="text-yellow-500 text-[10px] font-bold text-center mt-1 mb-2">⚠ WIRES</div>
            {/* Tangled wires */}
            {[
              { color: '#ef4444', top: 25 },
              { color: '#3b82f6', top: 50 },
              { color: '#eab308', top: 75 },
              { color: '#22c55e', top: 100 },
              { color: '#a855f7', top: 125 }
            ].map((wire, i) => (
              <div
                key={i}
                className="absolute h-3 rounded-full"
                style={{
                  backgroundColor: wire.color,
                  top: wire.top,
                  left: 8,
                  right: 8,
                  boxShadow: `0 2px 4px ${wire.color}66`
                }}
              />
            ))}
          </div>

          {/* Breaker box */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-16 w-32 h-20 bg-gradient-to-b from-yellow-600 to-yellow-800 rounded border-4 border-yellow-900">
            <div className="text-black text-[9px] font-bold text-center mt-1">DANGER</div>
            <div className="flex justify-center gap-3 mt-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-5 h-8 bg-gray-800 rounded border border-gray-900" />
              ))}
            </div>
          </div>

          {/* Caution sign */}
          <div className="absolute right-6 bottom-20 w-12 h-12 rotate-45 bg-yellow-400 border-4 border-yellow-600 flex items-center justify-center">
            <span className="text-black text-xl font-black -rotate-45">⚡</span>
          </div>
        </div>
      );

    case Location.MedBay:
      return (
        <div className="absolute inset-0 pt-20 px-4">
          {/* Clean tile floor */}
          <div className="absolute inset-0 top-14 opacity-20" style={{
            backgroundImage: 'linear-gradient(#4ade80 1px, transparent 1px), linear-gradient(90deg, #4ade80 1px, transparent 1px)',
            backgroundSize: '30px 30px'
          }} />

          {/* Medical scanner */}
          <div className="absolute" style={{ left: cx - 55, top: cy - 50 }}>
            <div className="w-28 h-40 bg-gradient-to-b from-teal-700 to-teal-900 rounded-xl border-4 border-teal-950 overflow-hidden" style={{
              boxShadow: '0 8px 24px rgba(0,0,0,0.5), inset 0 0 30px rgba(45, 212, 191, 0.2)'
            }}>
              {/* Scanner glass */}
              <div className="w-24 h-32 mx-auto mt-2 bg-teal-950/80 rounded-lg border-2 border-teal-800 overflow-hidden">
                <motion.div
                  className="w-full h-3 bg-gradient-to-b from-teal-400 to-transparent"
                  animate={{ y: [0, 110, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                />
                {/* Body silhouette */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30">
                  <div className="w-6 h-6 bg-teal-400 rounded-full mb-1 mx-auto" />
                  <div className="w-8 h-14 bg-teal-400 rounded-lg" />
                </div>
              </div>
            </div>
            <div className="text-teal-400 text-[11px] font-bold text-center mt-2">MEDSCAN</div>
          </div>

          {/* Medical beds with pillows */}
          {[{ x: 12, y: 24 }, { x: w - 88, y: 24 }].map((pos, i) => (
            <div key={i} className="absolute" style={{ left: pos.x, top: pos.y }}>
              <div className="w-20 h-12 bg-white rounded border-4 border-gray-300" style={{
                boxShadow: '2px 2px 8px rgba(0,0,0,0.2)'
              }}>
                {/* Pillow */}
                <div className="absolute -top-1 left-1 w-6 h-4 bg-blue-100 rounded-sm border border-blue-200" />
                {/* Sheet */}
                <div className="absolute bottom-1 left-2 right-2 h-2 bg-blue-50 rounded-sm" />
              </div>
              {/* IV stand */}
              <div className="absolute -right-4 top-0 w-1 h-16 bg-gray-400">
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-gray-500 rounded" />
                <div className="absolute top-0 right-1 w-4 h-6 bg-blue-300 rounded border border-blue-400" />
              </div>
            </div>
          ))}

          {/* Medicine cabinet */}
          <div className="absolute right-8 bottom-20 w-20 h-24 bg-white rounded border-4 border-gray-300" style={{
            boxShadow: '2px 2px 8px rgba(0,0,0,0.2)'
          }}>
            <div className="text-red-500 text-xl text-center mt-1">+</div>
            <div className="grid grid-cols-3 gap-1 p-1">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-4 h-6 rounded-sm" style={{
                  backgroundColor: ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'][i]
                }} />
              ))}
            </div>
          </div>

          {/* Heart monitor */}
          <div className="absolute left-8 bottom-20 w-18 h-16 bg-gray-800 rounded border-2 border-gray-700">
            <motion.svg className="w-full h-12 mt-1" viewBox="0 0 60 30">
              <motion.path
                d="M0,15 L10,15 L15,5 L20,25 L25,15 L35,15 L40,5 L45,25 L50,15 L60,15"
                fill="none"
                stroke="#22c55e"
                strokeWidth="2"
                animate={{ pathLength: [0, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </motion.svg>
          </div>
        </div>
      );

    case Location.Security:
      return (
        <div className="absolute inset-0 pt-20 px-4">
          {/* Dark carpet floor */}
          <div className="absolute inset-0 top-14 bg-gradient-to-b from-indigo-950/50 to-indigo-900/30" />

          {/* Monitor bank */}
          <div className="absolute left-1/2 -translate-x-1/2 top-20 w-[90%] h-20 bg-gray-800 rounded-lg border-4 border-gray-900 p-2" style={{
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)'
          }}>
            <div className="flex gap-2 justify-center h-full">
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-16 h-full bg-gray-950 rounded border-2 border-gray-700 overflow-hidden"
                  style={{ boxShadow: 'inset 0 0 10px rgba(34, 197, 94, 0.2)' }}
                >
                  {/* Camera feed simulation */}
                  <div className="w-full h-full relative">
                    <div className="absolute inset-1 bg-green-950/50 rounded" />
                    <motion.div
                      className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                    <div className="absolute bottom-1 left-1 text-[6px] text-green-500 font-mono">CAM{i + 1}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Control desk */}
          <div className="absolute left-1/2 -translate-x-1/2 top-44 w-[70%] h-10 bg-gradient-to-b from-gray-600 to-gray-700 rounded-t-lg border-4 border-gray-800">
            {/* Buttons and knobs */}
            <div className="flex justify-center gap-4 mt-1">
              {[...Array(6)].map((_, i) => (
                <div key={i} className={`w-3 h-3 rounded-full ${i % 2 === 0 ? 'bg-green-500' : 'bg-red-500'}`} />
              ))}
            </div>
          </div>

          {/* Office chair */}
          <div className="absolute left-1/2 -translate-x-1/2 top-56 w-16 h-16">
            <div className="w-14 h-10 mx-auto bg-gradient-to-b from-gray-500 to-gray-700 rounded-t-lg border-2 border-gray-800" />
            <div className="w-12 h-4 mx-auto bg-gray-600 rounded-b border-2 border-gray-800" />
            <div className="w-2 h-4 mx-auto bg-gray-700" />
            <div className="w-10 h-2 mx-auto bg-gray-800 rounded-full" />
          </div>

          {/* Wall clock */}
          <div className="absolute right-6 top-20 w-12 h-12 bg-white rounded-full border-4 border-gray-800 flex items-center justify-center">
            <div className="w-1 h-4 bg-gray-800 absolute origin-bottom" style={{ transform: 'rotate(0deg)' }} />
            <div className="w-1 h-3 bg-gray-600 absolute origin-bottom" style={{ transform: 'rotate(90deg)' }} />
          </div>

          {/* Coffee mug */}
          <div className="absolute left-6 bottom-20 w-8 h-10 bg-white rounded-b-lg border-2 border-gray-300">
            <div className="absolute -right-3 top-2 w-3 h-4 border-2 border-gray-300 rounded-r-full" />
            <div className="w-6 h-2 mx-auto mt-1 bg-amber-800 rounded-t-full" />
          </div>
        </div>
      );

    case Location.UpperEngine:
    case Location.LowerEngine:
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
          {/* Metal floor grating */}
          <div className="absolute inset-0 top-14 opacity-30" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, #374151 0, #374151 2px, transparent 2px, transparent 8px), repeating-linear-gradient(90deg, #374151 0, #374151 2px, transparent 2px, transparent 8px)',
            backgroundSize: '8px 8px'
          }} />

          {/* Engine housing */}
          <div className="relative">
            {/* Outer ring */}
            <div className="w-44 h-44 rounded-full bg-gradient-to-b from-gray-600 to-gray-800 border-8 border-gray-900 flex items-center justify-center" style={{
              boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 4px 16px rgba(0,0,0,0.4)'
            }}>
              {/* Inner engine core */}
              <motion.div
                className="w-32 h-32 rounded-full border-6 border-orange-900 flex items-center justify-center"
                style={{
                  background: 'radial-gradient(circle at 40% 40%, #fbbf24 0%, #f97316 30%, #ea580c 60%, #9a3412 100%)',
                  boxShadow: '0 0 40px rgba(251, 146, 60, 0.6), inset 0 0 30px rgba(0,0,0,0.3)'
                }}
                animate={{
                  scale: [1, 1.05, 1],
                  boxShadow: [
                    '0 0 40px rgba(251, 146, 60, 0.6)',
                    '0 0 60px rgba(251, 146, 60, 0.8)',
                    '0 0 40px rgba(251, 146, 60, 0.6)'
                  ]
                }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                {/* Center bolt */}
                <div className="w-12 h-12 bg-gray-700 rounded-full border-4 border-gray-800 flex items-center justify-center">
                  <div className="w-4 h-4 bg-gray-600 rounded" />
                </div>
              </motion.div>
            </div>

            {/* Fuel gauge */}
            <div className="absolute -right-16 top-1/2 -translate-y-1/2 w-10 h-24 bg-gray-800 rounded border-2 border-gray-900 overflow-hidden">
              <div className="text-[8px] text-gray-400 text-center mt-1">FUEL</div>
              <div className="w-6 h-16 mx-auto mt-1 bg-gray-900 rounded overflow-hidden">
                <motion.div
                  className="w-full bg-gradient-to-t from-green-600 to-green-400"
                  animate={{ height: ['60%', '75%', '60%'] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              </div>
            </div>
          </div>

          {/* Engine label */}
          <div className="mt-4 px-4 py-1 bg-gray-800 rounded border-2 border-gray-700">
            <span className="text-orange-400 text-sm font-bold tracking-wider">
              {location === Location.UpperEngine ? 'UPPER' : 'LOWER'} ENGINE
            </span>
          </div>

          {/* Steam vents */}
          {[{ x: 20, y: 60 }, { x: w - 50, y: 60 }].map((pos, i) => (
            <motion.div
              key={i}
              className="absolute w-8 h-4 bg-gray-700 rounded"
              style={{ left: pos.x, top: pos.y }}
            >
              <motion.div
                className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-10 bg-gradient-to-t from-gray-400/40 to-transparent rounded-full blur-sm"
                animate={{ opacity: [0, 0.6, 0], y: [0, -20, -40] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
              />
            </motion.div>
          ))}
        </div>
      );

    case Location.Reactor:
      return (
        <div className="absolute inset-0 flex items-center justify-center pt-8">
          {/* Radiation warning floor */}
          <div className="absolute inset-0 top-14" style={{
            background: 'repeating-linear-gradient(45deg, #1f2937 0, #1f2937 20px, #374151 20px, #374151 40px)'
          }} />

          {/* Reactor containment unit */}
          <div className="relative">
            <div className="w-52 h-36 bg-gradient-to-b from-gray-700 to-gray-900 rounded-xl border-6 border-gray-950 flex items-center justify-center" style={{
              boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 0 40px rgba(0,0,0,0.4)'
            }}>
              {/* Reactor core */}
              <motion.div
                className="w-24 h-24 rounded-full border-6 border-cyan-900 flex items-center justify-center"
                style={{
                  background: 'radial-gradient(circle at 40% 40%, #67e8f9 0%, #06b6d4 30%, #0891b2 60%, #155e75 100%)',
                }}
                animate={{
                  boxShadow: [
                    '0 0 30px #06b6d4, 0 0 60px #06b6d466',
                    '0 0 50px #06b6d4, 0 0 100px #06b6d466',
                    '0 0 30px #06b6d4, 0 0 60px #06b6d466'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {/* Atom symbol */}
                <div className="relative w-16 h-16">
                  {[0, 60, 120].map((rot, i) => (
                    <motion.div
                      key={i}
                      className="absolute inset-0 border-2 border-cyan-200/50 rounded-full"
                      style={{ transform: `rotate(${rot}deg) scaleY(0.3)` }}
                      animate={{ rotate: [rot, rot + 360] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    />
                  ))}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full" />
                </div>
              </motion.div>

              {/* Side indicators */}
              {[-70, 70].map((x, i) => (
                <div key={i} className="absolute top-1/2 -translate-y-1/2" style={{ left: x < 0 ? 10 : undefined, right: x > 0 ? 10 : undefined }}>
                  <motion.div
                    className="w-4 h-4 rounded-full bg-green-500 border-2 border-green-700"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.5 }}
                  />
                </div>
              ))}
            </div>

            {/* Hand scanners */}
            {[-85, w - 15].map((x, i) => (
              <div key={i} className="absolute top-1/2 -translate-y-1/2" style={{ left: i === 0 ? -70 : undefined, right: i === 1 ? -70 : undefined }}>
                <div className="w-14 h-20 bg-gradient-to-b from-gray-600 to-gray-800 rounded-lg border-4 border-gray-900">
                  <div className="w-10 h-12 mx-auto mt-1 bg-gray-900 rounded border border-gray-700">
                    <div className="text-red-400 text-[7px] text-center mt-1">SCAN</div>
                    <div className="w-6 h-6 mx-auto mt-1 border-2 border-dashed border-red-500 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Warning label */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-1 bg-yellow-500 rounded">
            <span className="text-black text-[10px] font-bold">☢ REACTOR CORE</span>
          </div>
        </div>
      );

    case Location.Admin:
      return (
        <div className="absolute inset-0 flex flex-col items-center pt-20 px-4">
          {/* Office carpet */}
          <div className="absolute inset-0 top-14 bg-gradient-to-b from-gray-700/30 to-gray-800/30" />

          {/* Admin map table */}
          <div className="relative w-52 h-40 bg-gradient-to-b from-gray-600 to-gray-800 rounded-xl border-6 border-gray-900 flex items-center justify-center" style={{
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
          }}>
            {/* Map display */}
            <div className="w-44 h-32 bg-gray-950 rounded-lg border-4 border-gray-700 overflow-hidden" style={{
              boxShadow: 'inset 0 0 20px rgba(34, 197, 94, 0.2)'
            }}>
              {/* Mini map representation */}
              <div className="relative w-full h-full p-2">
                {/* Room dots */}
                {[
                  { x: '50%', y: '15%', label: 'CAF' },
                  { x: '20%', y: '20%', label: 'ENG' },
                  { x: '35%', y: '25%', label: 'MED' },
                  { x: '15%', y: '45%', label: 'SEC' },
                  { x: '80%', y: '35%', label: 'ADM' },
                  { x: '15%', y: '70%', label: 'ENG' },
                  { x: '40%', y: '75%', label: 'ELC' },
                  { x: '60%', y: '80%', label: 'STR' },
                  { x: '15%', y: '90%', label: 'RCT' },
                ].map((room, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-green-500 rounded-full"
                    style={{ left: room.x, top: room.y, transform: 'translate(-50%, -50%)' }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
                <div className="absolute bottom-1 right-1 text-[8px] text-green-500 font-mono">THE SKELD</div>
              </div>
            </div>
          </div>

          {/* Filing cabinets */}
          {[12, w - 52].map((x, i) => (
            <div key={i} className="absolute top-24" style={{ left: x }}>
              <div className="w-12 h-32 bg-gradient-to-b from-gray-500 to-gray-700 rounded border-4 border-gray-800" style={{
                boxShadow: '2px 2px 8px rgba(0,0,0,0.4)'
              }}>
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="w-10 h-8 mx-auto mt-1 bg-gray-600 rounded-sm border border-gray-800">
                    <div className="w-4 h-1 mx-auto mt-3 bg-gray-400 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Swipe card station */}
          <div className="absolute bottom-16 right-8 w-20 h-14 bg-gray-800 rounded border-2 border-gray-700">
            <div className="text-[8px] text-gray-400 text-center mt-1">CARD READER</div>
            <div className="w-14 h-6 mx-auto mt-1 bg-gray-900 rounded border border-gray-700" />
            <div className="w-8 h-1 mx-auto mt-1 bg-green-500 rounded" />
          </div>
        </div>
      );

    case Location.Storage:
      return (
        <div className="absolute inset-0 pt-20 px-4">
          {/* Concrete floor */}
          <div className="absolute inset-0 top-14 opacity-40" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, #374151 0, #374151 2px, transparent 2px, transparent 60px), repeating-linear-gradient(90deg, #374151 0, #374151 2px, transparent 2px, transparent 60px)',
            backgroundSize: '60px 60px'
          }} />

          {/* Stacked crates with details */}
          {[
            { x: 15, y: 24, w: 24, h: 24 },
            { x: 15, y: 54, w: 28, h: 20 },
            { x: w - 95, y: 24, w: 26, h: 26 },
            { x: w - 90, y: 56, w: 22, h: 18 },
            { x: 20, y: h - 120, w: 28, h: 28 },
            { x: w - 100, y: h - 115, w: 24, h: 24 },
            { x: 50, y: h - 95, w: 20, h: 20 },
          ].map((crate, i) => (
            <div
              key={i}
              className="absolute bg-gradient-to-b from-amber-600 to-amber-800 rounded border-4 border-amber-900"
              style={{
                left: crate.x, top: crate.y, width: crate.w, height: crate.h,
                boxShadow: '3px 3px 8px rgba(0,0,0,0.4)'
              }}
            >
              {/* Wood grain lines */}
              <div className="absolute inset-1 opacity-30" style={{
                backgroundImage: 'repeating-linear-gradient(0deg, #92400e 0, #92400e 1px, transparent 1px, transparent 4px)'
              }} />
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-amber-950" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-amber-950" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-amber-950" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-amber-950" />
            </div>
          ))}

          {/* Fuel cans */}
          <div className="absolute" style={{ left: cx - 35, top: cy + 20 }}>
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-14 h-20 bg-gradient-to-b from-red-500 to-red-700 rounded-lg border-4 border-red-900" style={{
                  boxShadow: '2px 2px 8px rgba(0,0,0,0.4)'
                }}>
                  <div className="w-6 h-3 mx-auto -mt-1 bg-red-800 rounded-t border-2 border-red-900" />
                  <div className="text-white text-[8px] font-bold text-center mt-4">FUEL</div>
                  <div className="w-8 h-1 mx-auto mt-1 bg-yellow-400 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Forklift */}
          <div className="absolute right-12 bottom-16">
            <div className="w-16 h-10 bg-gradient-to-b from-yellow-500 to-yellow-600 rounded-t border-2 border-yellow-700">
              <div className="w-6 h-4 ml-1 mt-1 bg-gray-800 rounded" />
            </div>
            <div className="flex gap-1 mt-1">
              <div className="w-4 h-4 bg-gray-800 rounded-full border-2 border-gray-900" />
              <div className="w-6 h-4 bg-gray-700" />
              <div className="w-4 h-4 bg-gray-800 rounded-full border-2 border-gray-900" />
            </div>
            {/* Forks */}
            <div className="absolute -left-8 bottom-2 w-8 h-1 bg-gray-600 rounded" />
            <div className="absolute -left-8 bottom-4 w-8 h-1 bg-gray-600 rounded" />
          </div>

          {/* Barrel */}
          <div className="absolute left-12 bottom-24 w-12 h-16 bg-gradient-to-r from-gray-600 to-gray-500 rounded-lg border-2 border-gray-700">
            <div className="absolute top-2 left-0 right-0 h-1 bg-gray-700" />
            <div className="absolute bottom-2 left-0 right-0 h-1 bg-gray-700" />
          </div>
        </div>
      );

    default:
      return null;
  }
}
