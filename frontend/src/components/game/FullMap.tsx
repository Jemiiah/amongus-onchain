"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Player, Location, LocationNames, DeadBody as DeadBodyType, PlayerColors } from "@/types/game";
import { AmongUsSprite, DeadBodySprite } from "./AmongUsSprite";

interface FullMapProps {
  players: Player[];
  deadBodies: DeadBodyType[];
  currentPlayer?: `0x${string}`;
  onRoomClick?: (location: Location) => void;
  selectedRoom?: Location;
}

// Room layout configuration - The Skeld style
const ROOMS: Record<Location, {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  shape?: "rect" | "circle" | "polygon";
}> = {
  [Location.Cafeteria]: { x: 400, y: 80, width: 180, height: 140, color: "#4a5568" },
  [Location.Admin]: { x: 480, y: 280, width: 120, height: 100, color: "#4a5568" },
  [Location.Storage]: { x: 400, y: 420, width: 140, height: 120, color: "#5a4a3a" },
  [Location.Electrical]: { x: 220, y: 380, width: 100, height: 100, color: "#3a4a5a" },
  [Location.MedBay]: { x: 240, y: 160, width: 120, height: 100, color: "#3a5a4a" },
  [Location.UpperEngine]: { x: 60, y: 80, width: 120, height: 120, color: "#5a3a3a" },
  [Location.LowerEngine]: { x: 60, y: 380, width: 120, height: 120, color: "#5a3a3a" },
  [Location.Security]: { x: 60, y: 240, width: 100, height: 100, color: "#3a3a5a" },
  [Location.Reactor]: { x: 60, y: 540, width: 140, height: 80, color: "#5a4a3a" },
};

// Corridors connecting rooms
const CORRIDORS: { from: Location; to: Location; path: string }[] = [
  { from: Location.Cafeteria, to: Location.MedBay, path: "M400,150 L360,150 L360,200" },
  { from: Location.Cafeteria, to: Location.Admin, path: "M490,220 L490,280" },
  { from: Location.Cafeteria, to: Location.UpperEngine, path: "M400,120 L180,120" },
  { from: Location.Admin, to: Location.Storage, path: "M520,380 L520,420" },
  { from: Location.Storage, to: Location.Electrical, path: "M400,480 L320,480 L320,430" },
  { from: Location.Storage, to: Location.LowerEngine, path: "M400,500 L180,500 L180,440" },
  { from: Location.Electrical, to: Location.LowerEngine, path: "M220,430 L180,430" },
  { from: Location.MedBay, to: Location.UpperEngine, path: "M240,200 L180,200" },
  { from: Location.MedBay, to: Location.Security, path: "M240,260 L160,260" },
  { from: Location.UpperEngine, to: Location.Security, path: "M100,200 L100,240" },
  { from: Location.UpperEngine, to: Location.Reactor, path: "M80,200 L80,540" },
  { from: Location.LowerEngine, to: Location.Security, path: "M100,380 L100,340" },
  { from: Location.Security, to: Location.Reactor, path: "M80,340 L80,540" },
];

export function FullMap({
  players,
  deadBodies,
  currentPlayer,
  onRoomClick,
  selectedRoom,
}: FullMapProps) {
  // Group players by location
  const playersByLocation = players.reduce((acc, player) => {
    if (!acc[player.location]) acc[player.location] = [];
    acc[player.location].push(player);
    return acc;
  }, {} as Record<number, Player[]>);

  // Group dead bodies by location
  const bodiesByLocation = deadBodies.reduce((acc, body) => {
    if (!body.reported) {
      if (!acc[body.location]) acc[body.location] = [];
      acc[body.location].push(body);
    }
    return acc;
  }, {} as Record<number, DeadBodyType[]>);

  return (
    <div className="relative w-full bg-gray-900 rounded-xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
      {/* Space/ship background */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)"
        }}
      />

      {/* Stars */}
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.5 + 0.2,
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}

      {/* Map SVG */}
      <svg
        viewBox="0 0 700 650"
        className="relative w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Corridors */}
        {CORRIDORS.map((corridor, i) => (
          <g key={i}>
            {/* Corridor background */}
            <path
              d={corridor.path}
              stroke="#2d3748"
              strokeWidth="30"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Corridor lines */}
            <path
              d={corridor.path}
              stroke="#4a5568"
              strokeWidth="24"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ))}

        {/* Rooms */}
        {Object.entries(ROOMS).map(([locationStr, room]) => {
          const location = parseInt(locationStr) as Location;
          const isSelected = selectedRoom === location;
          const roomPlayers = playersByLocation[location] || [];
          const roomBodies = bodiesByLocation[location] || [];
          const hasCurrentPlayer = roomPlayers.some(p => p.address === currentPlayer);

          return (
            <g key={location}>
              {/* Room shadow */}
              <rect
                x={room.x + 4}
                y={room.y + 4}
                width={room.width}
                height={room.height}
                rx="8"
                fill="rgba(0,0,0,0.3)"
              />

              {/* Room background */}
              <motion.rect
                x={room.x}
                y={room.y}
                width={room.width}
                height={room.height}
                rx="8"
                fill={room.color}
                stroke={isSelected ? "#fbbf24" : hasCurrentPlayer ? "#60a5fa" : "#1a202c"}
                strokeWidth={isSelected ? "4" : "3"}
                className="cursor-pointer"
                onClick={() => onRoomClick?.(location)}
                whileHover={{ fill: adjustColor(room.color, 20) }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: location * 0.05 }}
              />

              {/* Room floor pattern */}
              <pattern
                id={`floor-${location}`}
                patternUnits="userSpaceOnUse"
                width="20"
                height="20"
              >
                <rect width="20" height="20" fill="transparent" />
                <rect x="0" y="0" width="10" height="10" fill="rgba(0,0,0,0.1)" />
                <rect x="10" y="10" width="10" height="10" fill="rgba(0,0,0,0.1)" />
              </pattern>
              <rect
                x={room.x}
                y={room.y}
                width={room.width}
                height={room.height}
                rx="8"
                fill={`url(#floor-${location})`}
                className="pointer-events-none"
              />

              {/* Room name */}
              <text
                x={room.x + room.width / 2}
                y={room.y + 20}
                textAnchor="middle"
                fill="#e2e8f0"
                fontSize="11"
                fontWeight="bold"
                className="pointer-events-none select-none"
                style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}
              >
                {LocationNames[location].toUpperCase()}
              </text>

              {/* Player count badge */}
              {roomPlayers.length > 0 && (
                <g>
                  <circle
                    cx={room.x + room.width - 15}
                    cy={room.y + 15}
                    r="12"
                    fill="#3b82f6"
                    stroke="#1e40af"
                    strokeWidth="2"
                  />
                  <text
                    x={room.x + room.width - 15}
                    y={room.y + 19}
                    textAnchor="middle"
                    fill="white"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    {roomPlayers.length}
                  </text>
                </g>
              )}

              {/* Dead body indicator */}
              {roomBodies.length > 0 && (
                <g>
                  <circle
                    cx={room.x + 15}
                    cy={room.y + 15}
                    r="10"
                    fill="#dc2626"
                    className="animate-pulse"
                  />
                  <text
                    x={room.x + 15}
                    y={room.y + 19}
                    textAnchor="middle"
                    fill="white"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    !
                  </text>
                </g>
              )}

              {/* Players in room */}
              <foreignObject
                x={room.x + 5}
                y={room.y + 28}
                width={room.width - 10}
                height={room.height - 35}
              >
                <div className="flex flex-wrap gap-1 justify-center items-start p-1 h-full overflow-hidden">
                  {roomPlayers.filter(p => p.isAlive).slice(0, 6).map((player, idx) => (
                    <motion.div
                      key={player.address}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <AmongUsSprite
                        colorId={player.colorId}
                        size={room.width > 140 ? 36 : 28}
                        showShadow={false}
                      />
                    </motion.div>
                  ))}
                  {roomBodies.slice(0, 2).map((body, idx) => {
                    const victim = players.find(p => p.address === body.victim);
                    return (
                      <motion.div
                        key={`body-${idx}`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        <DeadBodySprite
                          colorId={victim?.colorId || 0}
                          size={28}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              </foreignObject>
            </g>
          );
        })}

        {/* Ship outline decoration */}
        <rect
          x="40"
          y="60"
          width="620"
          height="560"
          rx="20"
          fill="none"
          stroke="#2d3748"
          strokeWidth="4"
          strokeDasharray="10,5"
          className="pointer-events-none"
        />

        {/* Map title */}
        <text
          x="350"
          y="40"
          textAnchor="middle"
          fill="#94a3b8"
          fontSize="18"
          fontWeight="bold"
          style={{ fontFamily: "'Comic Sans MS', cursive" }}
        >
          THE SKELD
        </text>
      </svg>

      {/* Legend */}
      <div className="absolute bottom-2 right-2 bg-black/60 rounded-lg p-2 text-xs">
        <div className="flex items-center gap-2 text-white mb-1">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Players in room</span>
        </div>
        <div className="flex items-center gap-2 text-white">
          <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
          <span>Dead body</span>
        </div>
      </div>
    </div>
  );
}

// Helper to lighten/darken colors
function adjustColor(color: string, amount: number): string {
  const hex = color.replace("#", "");
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
