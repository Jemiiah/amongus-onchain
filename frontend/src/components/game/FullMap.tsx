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

// Room layout configuration - The Skeld style with enhanced colors
const ROOMS: Record<Location, {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  accentColor: string;
  icon: string;
  shape?: "rect" | "circle" | "polygon";
}> = {
  [Location.Cafeteria]: { x: 400, y: 80, width: 180, height: 140, color: "#4a5568", accentColor: "#60a5fa", icon: "🍽️" },
  [Location.Admin]: { x: 480, y: 280, width: 120, height: 100, color: "#4a5568", accentColor: "#a78bfa", icon: "📊" },
  [Location.Storage]: { x: 400, y: 420, width: 140, height: 120, color: "#5a4a3a", accentColor: "#fbbf24", icon: "📦" },
  [Location.Electrical]: { x: 220, y: 380, width: 100, height: 100, color: "#3a4a5a", accentColor: "#facc15", icon: "⚡" },
  [Location.MedBay]: { x: 240, y: 160, width: 120, height: 100, color: "#3a5a4a", accentColor: "#2dd4bf", icon: "🏥" },
  [Location.UpperEngine]: { x: 60, y: 80, width: 120, height: 120, color: "#5a3a3a", accentColor: "#f97316", icon: "🔧" },
  [Location.LowerEngine]: { x: 60, y: 380, width: 120, height: 120, color: "#5a3a3a", accentColor: "#f97316", icon: "🔧" },
  [Location.Security]: { x: 60, y: 240, width: 100, height: 100, color: "#3a3a5a", accentColor: "#818cf8", icon: "📹" },
  [Location.Reactor]: { x: 60, y: 540, width: 140, height: 80, color: "#5a4a3a", accentColor: "#06b6d4", icon: "☢️" },
};

// Corridors connecting rooms with enhanced styling
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

// Vent positions for decoration
const VENTS = [
  { x: 150, y: 150 },
  { x: 300, y: 200 },
  { x: 150, y: 300 },
  { x: 280, y: 450 },
  { x: 450, y: 350 },
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
      {/* Space/ship background with gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 30% 20%, #1a1a3e 0%, #0f0f23 50%, #050510 100%)"
        }}
      />

      {/* Animated stars */}
      {[...Array(80)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${(i * 7 + 3) % 100}%`,
            top: `${(i * 11 + 7) % 100}%`,
            width: (i % 3) + 1,
            height: (i % 3) + 1,
            backgroundColor: i % 10 === 0 ? '#fef3c7' : i % 7 === 0 ? '#bfdbfe' : '#ffffff',
          }}
          animate={i % 4 === 0 ? { opacity: [0.2, 0.8, 0.2] } : { opacity: 0.2 + (i % 5) * 0.15 }}
          transition={i % 4 === 0 ? { duration: 1.5 + (i % 3), repeat: Infinity } : undefined}
        />
      ))}

      {/* Nebula effects */}
      <div className="absolute w-40 h-32 rounded-full opacity-10 blur-3xl" style={{
        left: '60%', top: '20%',
        background: 'radial-gradient(ellipse, #7c3aed 0%, transparent 70%)'
      }} />
      <div className="absolute w-32 h-40 rounded-full opacity-8 blur-3xl" style={{
        left: '10%', top: '60%',
        background: 'radial-gradient(ellipse, #06b6d4 0%, transparent 70%)'
      }} />

      {/* Map SVG */}
      <svg
        viewBox="0 0 700 650"
        className="relative w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Definitions for gradients and patterns */}
        <defs>
          <linearGradient id="corridorGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3d3d50" />
            <stop offset="100%" stopColor="#252535" />
          </linearGradient>
          <pattern id="corridorPattern" patternUnits="userSpaceOnUse" width="10" height="10">
            <rect width="10" height="10" fill="transparent" />
            <line x1="0" y1="5" x2="10" y2="5" stroke="#4a4a5a" strokeWidth="0.5" strokeDasharray="2,2" />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Corridors with enhanced styling */}
        {CORRIDORS.map((corridor, i) => (
          <g key={i}>
            {/* Corridor shadow */}
            <path
              d={corridor.path}
              stroke="#1a1a28"
              strokeWidth="34"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              transform="translate(2, 2)"
            />
            {/* Corridor base */}
            <path
              d={corridor.path}
              stroke="url(#corridorGradient)"
              strokeWidth="32"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Corridor inner */}
            <path
              d={corridor.path}
              stroke="#3a3a4a"
              strokeWidth="26"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Center line */}
            <path
              d={corridor.path}
              stroke="#eab30855"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="8,8"
            />
          </g>
        ))}

        {/* Vents decoration */}
        {VENTS.map((vent, i) => (
          <g key={`vent-${i}`}>
            <rect x={vent.x - 12} y={vent.y - 8} width="24" height="16" rx="2" fill="#1f2937" stroke="#374151" strokeWidth="2" />
            <line x1={vent.x - 8} y1={vent.y - 8} x2={vent.x - 8} y2={vent.y + 8} stroke="#374151" strokeWidth="1.5" />
            <line x1={vent.x} y1={vent.y - 8} x2={vent.x} y2={vent.y + 8} stroke="#374151" strokeWidth="1.5" />
            <line x1={vent.x + 8} y1={vent.y - 8} x2={vent.x + 8} y2={vent.y + 8} stroke="#374151" strokeWidth="1.5" />
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
              {/* Room outer glow for selected/current */}
              {(isSelected || hasCurrentPlayer) && (
                <motion.rect
                  x={room.x - 4}
                  y={room.y - 4}
                  width={room.width + 8}
                  height={room.height + 8}
                  rx="12"
                  fill="none"
                  stroke={isSelected ? "#fbbf24" : "#60a5fa"}
                  strokeWidth="2"
                  opacity="0.5"
                  filter="url(#glow)"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}

              {/* Room shadow */}
              <rect
                x={room.x + 5}
                y={room.y + 5}
                width={room.width}
                height={room.height}
                rx="10"
                fill="rgba(0,0,0,0.4)"
              />

              {/* Room background with gradient */}
              <defs>
                <linearGradient id={`roomGrad-${location}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={adjustColor(room.color, 15)} />
                  <stop offset="100%" stopColor={adjustColor(room.color, -20)} />
                </linearGradient>
              </defs>
              <motion.rect
                x={room.x}
                y={room.y}
                width={room.width}
                height={room.height}
                rx="10"
                fill={`url(#roomGrad-${location})`}
                stroke={isSelected ? "#fbbf24" : hasCurrentPlayer ? "#60a5fa" : "#1a202c"}
                strokeWidth={isSelected ? "4" : "3"}
                className="cursor-pointer"
                onClick={() => onRoomClick?.(location)}
                whileHover={{ fill: adjustColor(room.color, 25) }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: location * 0.05 }}
              />

              {/* Room floor pattern - checkered */}
              <pattern
                id={`floor-${location}`}
                patternUnits="userSpaceOnUse"
                width="16"
                height="16"
              >
                <rect width="16" height="16" fill="transparent" />
                <rect x="0" y="0" width="8" height="8" fill="rgba(0,0,0,0.08)" />
                <rect x="8" y="8" width="8" height="8" fill="rgba(0,0,0,0.08)" />
              </pattern>
              <rect
                x={room.x}
                y={room.y}
                width={room.width}
                height={room.height}
                rx="10"
                fill={`url(#floor-${location})`}
                className="pointer-events-none"
              />

              {/* Room shine effect */}
              <rect
                x={room.x}
                y={room.y}
                width={room.width}
                height={room.height / 2}
                rx="10"
                fill="url(#shineGradient)"
                className="pointer-events-none"
                opacity="0.1"
              />
              <defs>
                <linearGradient id="shineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="white" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="white" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Room header bar */}
              <rect
                x={room.x}
                y={room.y}
                width={room.width}
                height="24"
                rx="10"
                fill={adjustColor(room.color, -10)}
                className="pointer-events-none"
              />
              <rect
                x={room.x}
                y={room.y + 14}
                width={room.width}
                height="10"
                fill={adjustColor(room.color, -10)}
                className="pointer-events-none"
              />

              {/* Room name with icon */}
              <text
                x={room.x + room.width / 2}
                y={room.y + 17}
                textAnchor="middle"
                fill="#e2e8f0"
                fontSize="10"
                fontWeight="bold"
                className="pointer-events-none select-none"
              >
                {LocationNames[location].toUpperCase()}
              </text>

              {/* Room accent decoration */}
              <rect
                x={room.x + 4}
                y={room.y + room.height - 8}
                width={room.width - 8}
                height="4"
                rx="2"
                fill={room.accentColor}
                opacity="0.4"
                className="pointer-events-none"
              />

              {/* Player count badge with glow */}
              {roomPlayers.length > 0 && (
                <g>
                  <motion.circle
                    cx={room.x + room.width - 15}
                    cy={room.y + 15}
                    r="14"
                    fill="#3b82f6"
                    opacity="0.3"
                    animate={{ r: [14, 16, 14] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <circle
                    cx={room.x + room.width - 15}
                    cy={room.y + 15}
                    r="11"
                    fill="url(#badgeGradient)"
                    stroke="#1e40af"
                    strokeWidth="2"
                  />
                  <defs>
                    <linearGradient id="badgeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                  </defs>
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

              {/* Dead body indicator with pulse */}
              {roomBodies.length > 0 && (
                <g>
                  <motion.circle
                    cx={room.x + 15}
                    cy={room.y + 15}
                    r="14"
                    fill="#dc2626"
                    opacity="0.4"
                    animate={{ r: [14, 18, 14], opacity: [0.4, 0.2, 0.4] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                  <circle
                    cx={room.x + 15}
                    cy={room.y + 15}
                    r="10"
                    fill="#dc2626"
                    stroke="#7f1d1d"
                    strokeWidth="2"
                  />
                  <text
                    x={room.x + 15}
                    y={room.y + 19}
                    textAnchor="middle"
                    fill="white"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    !
                  </text>
                </g>
              )}

              {/* Players in room */}
              <foreignObject
                x={room.x + 5}
                y={room.y + 26}
                width={room.width - 10}
                height={room.height - 38}
              >
                <div className="flex flex-wrap gap-1 justify-center items-start p-1 h-full overflow-hidden">
                  {roomPlayers.filter(p => p.isAlive).slice(0, 6).map((player, idx) => (
                    <motion.div
                      key={player.address}
                      initial={{ scale: 0, y: -10 }}
                      animate={{ scale: 1, y: 0 }}
                      transition={{ delay: idx * 0.08, type: "spring", stiffness: 200 }}
                    >
                      <AmongUsSprite
                        colorId={player.colorId}
                        size={room.width > 140 ? 34 : 26}
                        showShadow={false}
                      />
                    </motion.div>
                  ))}
                  {roomBodies.slice(0, 2).map((body, idx) => {
                    const victim = players.find(p => p.address === body.victim);
                    return (
                      <motion.div
                        key={`body-${idx}`}
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring" }}
                      >
                        <DeadBodySprite
                          colorId={victim?.colorId || 0}
                          size={26}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              </foreignObject>
            </g>
          );
        })}

        {/* Ship outline decoration with double border */}
        <rect
          x="35"
          y="55"
          width="630"
          height="570"
          rx="24"
          fill="none"
          stroke="#374151"
          strokeWidth="2"
          className="pointer-events-none"
        />
        <rect
          x="40"
          y="60"
          width="620"
          height="560"
          rx="20"
          fill="none"
          stroke="#4b5563"
          strokeWidth="3"
          strokeDasharray="12,6"
          className="pointer-events-none"
        />

        {/* Corner decorations */}
        {[[55, 75], [645, 75], [55, 605], [645, 605]].map(([x, y], i) => (
          <g key={`corner-${i}`}>
            <circle cx={x} cy={y} r="6" fill="#374151" stroke="#4b5563" strokeWidth="2" />
            <circle cx={x} cy={y} r="2" fill="#6b7280" />
          </g>
        ))}

        {/* Map title with styled background */}
        <rect x="280" y="20" width="140" height="30" rx="15" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text
          x="350"
          y="41"
          textAnchor="middle"
          fill="#60a5fa"
          fontSize="16"
          fontWeight="bold"
          letterSpacing="2"
        >
          THE SKELD
        </text>

        {/* Small ship icon in title */}
        <path
          d="M310 35 L320 28 L320 42 L310 35 M320 32 L330 32 L330 38 L320 38"
          fill="#60a5fa"
          opacity="0.6"
        />
      </svg>

      {/* Legend with enhanced styling */}
      <div className="absolute bottom-3 right-3 bg-gradient-to-br from-gray-900/90 to-black/90 rounded-xl p-3 text-xs border border-gray-700/50 backdrop-blur-sm">
        <div className="text-gray-400 text-[10px] font-bold mb-2 tracking-wider">LEGEND</div>
        <div className="flex items-center gap-2 text-white mb-1.5">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border border-blue-300/30" />
          <span className="text-gray-300">Players in room</span>
        </div>
        <div className="flex items-center gap-2 text-white mb-1.5">
          <motion.div
            className="w-4 h-4 rounded-full bg-gradient-to-br from-red-500 to-red-700 border border-red-400/30"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
          <span className="text-gray-300">Dead body</span>
        </div>
        <div className="flex items-center gap-2 text-white">
          <div className="w-4 h-4 rounded bg-gradient-to-br from-yellow-500 to-yellow-600 border border-yellow-400/30" />
          <span className="text-gray-300">Selected room</span>
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-3 left-3 bg-black/60 rounded-lg px-3 py-2 text-[10px] text-gray-400 border border-gray-700/30">
        Click room to select
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
