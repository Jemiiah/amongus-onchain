"use client";

import { motion } from "framer-motion";
import { Player, Location, LocationNames, DeadBody as DeadBodyType, PlayerColors } from "@/types/game";
import { AmongUsSprite, DeadBodySprite } from "./AmongUsSprite";

interface RoomViewProps {
  location: Location;
  players: Player[];
  deadBodies: DeadBodyType[];
  currentPlayer?: `0x${string}`;
  onClose: () => void;
}

// Room-specific decorations and features
const ROOM_FEATURES: Record<Location, {
  background: string;
  features: React.ReactNode;
  description: string;
}> = {
  [Location.Cafeteria]: {
    background: "linear-gradient(180deg, #4a5568 0%, #2d3748 100%)",
    description: "The main gathering area. Emergency meetings are called here.",
    features: (
      <>
        {/* Tables */}
        {[[150, 180], [350, 180], [250, 320]].map(([x, y], i) => (
          <div
            key={i}
            className="absolute"
            style={{ left: x, top: y }}
          >
            <div className="w-24 h-16 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 border-4 border-blue-800 shadow-lg" />
          </div>
        ))}
        {/* Emergency button */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-16 h-16 rounded-full bg-gradient-to-b from-gray-400 to-gray-600 border-4 border-gray-800 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-b from-red-500 to-red-700 border-2 border-red-900" />
          </div>
        </div>
      </>
    ),
  },
  [Location.Admin]: {
    background: "linear-gradient(180deg, #4a5568 0%, #374151 100%)",
    description: "The administrative center. Check the map here.",
    features: (
      <>
        {/* Admin table with map */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-48 h-32 bg-gray-700 rounded-lg border-4 border-gray-800 flex items-center justify-center">
            <div className="w-40 h-24 bg-green-900 rounded border-2 border-green-700">
              <div className="text-green-400 text-xs text-center mt-2">ADMIN MAP</div>
            </div>
          </div>
        </div>
        {/* Filing cabinets */}
        <div className="absolute left-4 top-1/4 w-12 h-24 bg-gray-600 rounded border-2 border-gray-700" />
        <div className="absolute right-4 top-1/4 w-12 h-24 bg-gray-600 rounded border-2 border-gray-700" />
      </>
    ),
  },
  [Location.Storage]: {
    background: "linear-gradient(180deg, #5a4a3a 0%, #3d322a 100%)",
    description: "A cluttered storage area with many containers.",
    features: (
      <>
        {/* Crates */}
        {[[80, 120], [320, 100], [150, 280], [380, 260]].map(([x, y], i) => (
          <div
            key={i}
            className="absolute"
            style={{ left: x, top: y }}
          >
            <div className="w-16 h-16 bg-amber-700 border-4 border-amber-900 rounded" />
          </div>
        ))}
        {/* Fuel cans */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-20 h-28 bg-red-700 rounded-lg border-4 border-red-900">
            <div className="text-white text-xs text-center mt-6">FUEL</div>
          </div>
        </div>
      </>
    ),
  },
  [Location.Electrical]: {
    background: "linear-gradient(180deg, #3a4a5a 0%, #1e2a3a 100%)",
    description: "Manages the ship's power. Sabotage the lights here.",
    features: (
      <>
        {/* Electric panels */}
        <div className="absolute left-8 top-1/4 w-20 h-40 bg-gray-700 rounded border-4 border-gray-800">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full m-1 ${i % 3 === 0 ? 'bg-red-500' : i % 3 === 1 ? 'bg-green-500' : 'bg-yellow-500'}`}
              style={{ marginLeft: (i % 4) * 16 + 8 }}
            />
          ))}
        </div>
        {/* Wires */}
        <div className="absolute right-8 top-1/3 w-24 h-32 bg-gray-800 rounded border-2 border-gray-700">
          <div className="text-yellow-400 text-xs text-center mt-2">WIRES</div>
          {['red', 'blue', 'yellow', 'green'].map((color, i) => (
            <div
              key={i}
              className="h-1 mx-2 my-2 rounded"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </>
    ),
  },
  [Location.MedBay]: {
    background: "linear-gradient(180deg, #3a5a4a 0%, #1a3a2a 100%)",
    description: "Medical facility. Get scanned to prove innocence.",
    features: (
      <>
        {/* Scanner */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-24 h-32 bg-teal-800 rounded-lg border-4 border-teal-900">
            <div className="h-full bg-gradient-to-b from-teal-400/30 to-transparent rounded animate-pulse" />
          </div>
          <div className="text-teal-300 text-xs text-center mt-1">SCANNER</div>
        </div>
        {/* Beds */}
        <div className="absolute left-8 top-1/4 w-16 h-8 bg-white rounded border-2 border-gray-300" />
        <div className="absolute right-8 top-1/4 w-16 h-8 bg-white rounded border-2 border-gray-300" />
      </>
    ),
  },
  [Location.UpperEngine]: {
    background: "linear-gradient(180deg, #5a3a3a 0%, #3a1a1a 100%)",
    description: "Upper engine room. Refuel the engines here.",
    features: (
      <>
        {/* Engine */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-600 to-red-800 border-8 border-gray-800 animate-pulse">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-yellow-500/50 to-transparent" />
          </div>
        </div>
        <div className="text-orange-300 text-xs text-center absolute bottom-20 left-1/2 -translate-x-1/2">
          UPPER ENGINE
        </div>
      </>
    ),
  },
  [Location.LowerEngine]: {
    background: "linear-gradient(180deg, #5a3a3a 0%, #3a1a1a 100%)",
    description: "Lower engine room. Keep it fueled!",
    features: (
      <>
        {/* Engine */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-600 to-red-800 border-8 border-gray-800 animate-pulse">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-yellow-500/50 to-transparent" />
          </div>
        </div>
        <div className="text-orange-300 text-xs text-center absolute bottom-20 left-1/2 -translate-x-1/2">
          LOWER ENGINE
        </div>
      </>
    ),
  },
  [Location.Security]: {
    background: "linear-gradient(180deg, #3a3a5a 0%, #1a1a3a 100%)",
    description: "Monitor cameras and watch for suspicious activity.",
    features: (
      <>
        {/* Camera monitors */}
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 flex gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-12 h-10 bg-gray-900 rounded border-2 border-gray-700">
              <div className="w-full h-full bg-gradient-to-br from-gray-600/50 to-transparent rounded" />
            </div>
          ))}
        </div>
        {/* Chair */}
        <div className="absolute left-1/2 top-2/3 -translate-x-1/2 w-10 h-10 bg-gray-700 rounded-full border-4 border-gray-800" />
        <div className="text-blue-300 text-xs text-center absolute bottom-16 left-1/2 -translate-x-1/2">
          CAMERAS
        </div>
      </>
    ),
  },
  [Location.Reactor]: {
    background: "linear-gradient(180deg, #5a4a3a 0%, #3a2a1a 100%)",
    description: "The ship's reactor. A critical sabotage target.",
    features: (
      <>
        {/* Reactor core */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-40 h-24 bg-gray-800 rounded-lg border-4 border-gray-900 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 border-4 border-cyan-800 animate-pulse">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-white/30 to-transparent" />
            </div>
          </div>
        </div>
        {/* Hand scanners */}
        <div className="absolute left-8 top-1/2 -translate-y-1/2 w-12 h-16 bg-gray-700 rounded border-2 border-gray-600">
          <div className="text-red-400 text-[8px] text-center mt-1">SCAN</div>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 w-12 h-16 bg-gray-700 rounded border-2 border-gray-600">
          <div className="text-red-400 text-[8px] text-center mt-1">SCAN</div>
        </div>
      </>
    ),
  },
};

// Player spawn positions within a room
const getPlayerPositions = (count: number, width: number, height: number) => {
  const positions: { x: number; y: number }[] = [];
  const rows = Math.ceil(count / 4);
  const cols = Math.min(count, 4);

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / 4);
    const col = i % 4;
    positions.push({
      x: (width / (cols + 1)) * (col + 1),
      y: height - 80 - row * 50,
    });
  }
  return positions;
};

export function RoomView({
  location,
  players,
  deadBodies,
  currentPlayer,
  onClose,
}: RoomViewProps) {
  const roomConfig = ROOM_FEATURES[location];
  const roomPlayers = players.filter(p => p.location === location && p.isAlive);
  const roomBodies = deadBodies.filter(b => b.location === location && !b.reported);
  const positions = getPlayerPositions(roomPlayers.length + roomBodies.length, 500, 400);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full max-w-2xl mx-4 rounded-xl overflow-hidden shadow-2xl"
        style={{ aspectRatio: "5/4" }}
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 50 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Room background */}
        <div
          className="absolute inset-0"
          style={{ background: roomConfig.background }}
        />

        {/* Floor pattern */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 30px, rgba(0,0,0,0.3) 30px, rgba(0,0,0,0.3) 32px),
              repeating-linear-gradient(90deg, transparent, transparent 30px, rgba(0,0,0,0.3) 30px, rgba(0,0,0,0.3) 32px)
            `,
          }}
        />

        {/* Room features */}
        <div className="absolute inset-0">
          {roomConfig.features}
        </div>

        {/* Room header */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
          <h2
            className="text-2xl font-bold text-white"
            style={{
              fontFamily: "'Comic Sans MS', cursive",
              textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
            }}
          >
            {LocationNames[location].toUpperCase()}
          </h2>
          <p className="text-white/70 text-sm mt-1">{roomConfig.description}</p>
        </div>

        {/* Dead bodies */}
        {roomBodies.map((body, i) => {
          const victim = players.find(p => p.address === body.victim);
          const pos = positions[roomPlayers.length + i] || { x: 100 + i * 80, y: 300 };
          return (
            <motion.div
              key={`body-${i}`}
              className="absolute"
              style={{ left: pos.x - 30, top: pos.y - 20 }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              <DeadBodySprite colorId={victim?.colorId || 0} size={60} />
            </motion.div>
          );
        })}

        {/* Players in room */}
        {roomPlayers.map((player, i) => {
          const pos = positions[i] || { x: 100 + i * 80, y: 300 };
          const isCurrentPlayer = player.address === currentPlayer;
          const color = PlayerColors[player.colorId];

          return (
            <motion.div
              key={player.address}
              className="absolute flex flex-col items-center"
              style={{ left: pos.x - 40, top: pos.y - 80 }}
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              {/* Current player indicator */}
              {isCurrentPlayer && (
                <motion.div
                  className="mb-1"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-yellow-400" />
                </motion.div>
              )}

              <AmongUsSprite
                colorId={player.colorId}
                size={70}
                showName={true}
                name={isCurrentPlayer ? "You" : color.name}
              />
            </motion.div>
          );
        })}

        {/* Close button */}
        <button
          className="absolute top-4 right-4 w-10 h-10 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-xl transition-colors"
          onClick={onClose}
        >
          ×
        </button>

        {/* Player count */}
        <div className="absolute bottom-4 right-4 bg-black/60 rounded-lg px-3 py-2">
          <span className="text-white text-sm">
            {roomPlayers.length} player{roomPlayers.length !== 1 ? "s" : ""} here
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
