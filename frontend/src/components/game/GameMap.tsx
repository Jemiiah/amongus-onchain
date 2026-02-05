"use client";

import { motion } from "framer-motion";
import {
  Location,
  LocationNames,
  MapLayout,
  RoomConnections,
  Player,
  DeadBody as DeadBodyType,
} from "@/types/game";
import { PlayerSprite, DeadBody } from "./PlayerSprite";

interface GameMapProps {
  players: Player[];
  deadBodies: DeadBodyType[];
  currentPlayer?: `0x${string}`;
  onRoomClick?: (location: Location) => void;
  highlightedRoom?: Location;
}

export function GameMap({
  players,
  deadBodies,
  currentPlayer,
  onRoomClick,
  highlightedRoom,
}: GameMapProps) {
  // Group players by location
  const playersByLocation = players.reduce(
    (acc, player) => {
      if (player.isAlive) {
        if (!acc[player.location]) acc[player.location] = [];
        acc[player.location].push(player);
      }
      return acc;
    },
    {} as Record<number, Player[]>
  );

  // Group dead bodies by location
  const bodiesByLocation = deadBodies.reduce(
    (acc, body) => {
      if (!body.reported) {
        if (!acc[body.location]) acc[body.location] = [];
        acc[body.location].push(body);
      }
      return acc;
    },
    {} as Record<number, DeadBodyType[]>
  );

  return (
    <div className="relative w-full max-w-3xl mx-auto bg-slate-800 rounded-xl p-4 overflow-hidden">
      {/* Space background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        {/* Stars */}
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              opacity: Math.random() * 0.5 + 0.3,
            }}
          />
        ))}
      </div>

      {/* Map container */}
      <svg
        viewBox="0 0 540 480"
        className="relative w-full h-auto"
        style={{ minHeight: "400px" }}
      >
        {/* Room connections (corridors) */}
        {RoomConnections.map(([from, to], i) => {
          const fromRoom = MapLayout[from];
          const toRoom = MapLayout[to];
          return (
            <line
              key={i}
              x1={fromRoom.x + fromRoom.width / 2}
              y1={fromRoom.y + fromRoom.height / 2}
              x2={toRoom.x + toRoom.width / 2}
              y2={toRoom.y + toRoom.height / 2}
              stroke="#4a5568"
              strokeWidth="12"
              strokeLinecap="round"
            />
          );
        })}

        {/* Rooms */}
        {Object.entries(MapLayout).map(([locationStr, layout]) => {
          const location = parseInt(locationStr) as Location;
          const isHighlighted = highlightedRoom === location;
          const roomPlayers = playersByLocation[location] || [];
          const roomBodies = bodiesByLocation[location] || [];

          return (
            <g key={location}>
              {/* Room background */}
              <motion.rect
                x={layout.x}
                y={layout.y}
                width={layout.width}
                height={layout.height}
                rx="8"
                fill={isHighlighted ? "#4c1d95" : "#374151"}
                stroke={isHighlighted ? "#8b5cf6" : "#6b7280"}
                strokeWidth={isHighlighted ? "3" : "2"}
                className={onRoomClick ? "cursor-pointer" : ""}
                onClick={() => onRoomClick?.(location)}
                whileHover={onRoomClick ? { fill: "#4b5563" } : {}}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: location * 0.05 }}
              />

              {/* Room name */}
              <text
                x={layout.x + layout.width / 2}
                y={layout.y + 16}
                textAnchor="middle"
                fill="#e5e7eb"
                fontSize="10"
                fontWeight="bold"
                className="pointer-events-none select-none"
              >
                {LocationNames[location]}
              </text>

              {/* Players in room */}
              <foreignObject
                x={layout.x + 5}
                y={layout.y + 22}
                width={layout.width - 10}
                height={layout.height - 28}
              >
                <div className="flex flex-wrap gap-1 justify-center items-center h-full">
                  {roomPlayers.map((player) => (
                    <PlayerSprite
                      key={player.address}
                      colorId={player.colorId}
                      isAlive={player.isAlive}
                      size="sm"
                      isSelected={player.address === currentPlayer}
                    />
                  ))}
                  {roomBodies.map((body, i) => (
                    <DeadBody
                      key={`body-${i}`}
                      colorId={
                        players.find((p) => p.address === body.victim)?.colorId || 0
                      }
                      size="sm"
                    />
                  ))}
                </div>
              </foreignObject>
            </g>
          );
        })}

        {/* Legend */}
        <g transform="translate(420, 420)">
          <rect
            x="0"
            y="0"
            width="110"
            height="50"
            rx="6"
            fill="#1f2937"
            stroke="#374151"
            strokeWidth="1"
          />
          <text x="10" y="16" fill="#9ca3af" fontSize="8">
            The Skeld
          </text>
          <text x="10" y="30" fill="#6b7280" fontSize="7">
            {players.filter((p) => p.isAlive).length} alive
          </text>
          <text x="10" y="42" fill="#6b7280" fontSize="7">
            {deadBodies.filter((b) => !b.reported).length} bodies
          </text>
        </g>
      </svg>
    </div>
  );
}
