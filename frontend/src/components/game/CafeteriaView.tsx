"use client";

import { motion } from "framer-motion";
import { Player, Location, DeadBody as DeadBodyType } from "@/types/game";
import { AmongUsSprite, DeadBodySprite } from "./AmongUsSprite";

interface CafeteriaViewProps {
  players: Player[];
  deadBodies: DeadBodyType[];
  currentPlayer?: `0x${string}`;
}

// Table positions in the cafeteria
const TABLE_POSITIONS = [
  { x: 180, y: 120, size: 100 },
  { x: 420, y: 120, size: 100 },
  { x: 180, y: 320, size: 100 },
  { x: 420, y: 320, size: 100 },
  { x: 300, y: 220, size: 120 }, // Center table (larger)
];

// Player spawn positions around the cafeteria
const PLAYER_POSITIONS = [
  { x: 100, y: 180 },
  { x: 500, y: 180 },
  { x: 100, y: 380 },
  { x: 500, y: 380 },
  { x: 250, y: 100 },
  { x: 350, y: 100 },
  { x: 250, y: 420 },
  { x: 350, y: 420 },
  { x: 300, y: 160 },
  { x: 300, y: 340 },
];

export function CafeteriaView({
  players,
  deadBodies,
  currentPlayer,
}: CafeteriaViewProps) {
  // Filter players in cafeteria
  const cafeteriaPlayers = players.filter(p => p.location === Location.Cafeteria && p.isAlive);
  const cafeteriaBodies = deadBodies.filter(b => b.location === Location.Cafeteria && !b.reported);

  return (
    <div className="relative w-full aspect-[4/3] max-w-4xl mx-auto overflow-hidden rounded-lg">
      {/* Floor */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "#5a5a5a",
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 40px,
              #4a4a4a 40px,
              #4a4a4a 42px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 40px,
              #4a4a4a 40px,
              #4a4a4a 42px
            )
          `,
        }}
      />

      {/* Walls */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#3a3a4a] to-[#4a4a5a]" />
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#2a2a3a] to-transparent" />

      {/* Emergency button in center */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="relative">
          {/* Button base */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-b from-gray-500 to-gray-700 border-4 border-gray-800 flex items-center justify-center shadow-lg">
            <div className="w-14 h-14 rounded-full bg-gradient-to-b from-red-500 to-red-700 border-2 border-red-900 flex items-center justify-center">
              <span className="text-white text-xs font-bold text-center leading-tight">
                EMERGENCY
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tables */}
      {TABLE_POSITIONS.map((table, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: table.x - table.size / 2,
            top: table.y - table.size / 2,
          }}
        >
          {/* Table shadow */}
          <div
            className="absolute bg-black/30 rounded-full"
            style={{
              width: table.size,
              height: table.size * 0.4,
              top: table.size * 0.3,
              left: 0,
              filter: "blur(4px)",
            }}
          />
          {/* Table top */}
          <div
            className="relative rounded-full"
            style={{
              width: table.size,
              height: table.size * 0.6,
              background: "linear-gradient(180deg, #4a90b8 0%, #2d6b8a 100%)",
              border: "3px solid #1a4a5a",
              boxShadow: "inset 0 -10px 20px rgba(0,0,0,0.3)",
            }}
          >
            {/* Table highlight */}
            <div
              className="absolute top-2 left-1/2 -translate-x-1/2 rounded-full opacity-30"
              style={{
                width: table.size * 0.6,
                height: table.size * 0.2,
                background: "linear-gradient(180deg, white 0%, transparent 100%)",
              }}
            />
          </div>
          {/* Table base/pedestal */}
          <div
            className="absolute left-1/2 -translate-x-1/2 bg-gray-600"
            style={{
              width: table.size * 0.3,
              height: table.size * 0.15,
              bottom: -table.size * 0.05,
              borderRadius: "0 0 8px 8px",
            }}
          />
        </div>
      ))}

      {/* Dead bodies */}
      {cafeteriaBodies.map((body, i) => {
        const pos = PLAYER_POSITIONS[i % PLAYER_POSITIONS.length];
        const victimPlayer = players.find(p => p.address === body.victim);
        return (
          <motion.div
            key={`body-${i}`}
            className="absolute"
            style={{
              left: pos.x - 30,
              top: pos.y - 20,
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <DeadBodySprite
              colorId={victimPlayer?.colorId || 0}
              size={60}
            />
          </motion.div>
        );
      })}

      {/* Players */}
      {cafeteriaPlayers.map((player, i) => {
        const pos = PLAYER_POSITIONS[i % PLAYER_POSITIONS.length];
        const isCurrentPlayer = player.address === currentPlayer;

        return (
          <motion.div
            key={player.address}
            className="absolute"
            style={{
              left: pos.x - 40,
              top: pos.y - 70,
              zIndex: Math.floor(pos.y),
            }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <AmongUsSprite
              colorId={player.colorId}
              isAlive={player.isAlive}
              size={80}
              showName={true}
              name={isCurrentPlayer ? "You" : `Agent ${i + 1}`}
              direction={pos.x < 300 ? "right" : "left"}
            />
            {isCurrentPlayer && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-yellow-400 animate-bounce" />
              </div>
            )}
          </motion.div>
        );
      })}

      {/* Cafeteria label */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2">
        <span
          className="text-white text-2xl font-bold tracking-widest"
          style={{
            textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
            fontFamily: "'Comic Sans MS', cursive, sans-serif",
          }}
        >
          CAFETERIA
        </span>
      </div>
    </div>
  );
}
