"use client";

import { motion } from "framer-motion";
import { PlayerColors } from "@/types/game";

interface PlayerSpriteProps {
  colorId: number;
  isAlive: boolean;
  isGhost?: boolean;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  name?: string;
  isSelected?: boolean;
  onClick?: () => void;
}

const sizeMap = {
  sm: { width: 24, height: 30 },
  md: { width: 40, height: 50 },
  lg: { width: 60, height: 75 },
};

export function PlayerSprite({
  colorId,
  isAlive,
  isGhost = false,
  size = "md",
  showName = false,
  name,
  isSelected = false,
  onClick,
}: PlayerSpriteProps) {
  const color = PlayerColors[colorId] || PlayerColors[0];
  const { width, height } = sizeMap[size];
  const opacity = isGhost || !isAlive ? 0.5 : 1;

  return (
    <motion.div
      className={`flex flex-col items-center cursor-pointer ${onClick ? "hover:scale-110" : ""}`}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.1 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
      style={{ opacity }}
    >
      {/* Among Us Character SVG */}
      <svg
        width={width}
        height={height}
        viewBox="0 0 40 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={isSelected ? "ring-2 ring-yellow-400 rounded-full" : ""}
      >
        {/* Body */}
        <ellipse
          cx="20"
          cy="30"
          rx="16"
          ry="18"
          fill={color.hex}
          stroke={isSelected ? "#facc15" : "#000"}
          strokeWidth="2"
        />

        {/* Backpack */}
        <rect
          x="2"
          y="22"
          width="8"
          height="16"
          rx="4"
          fill={color.hex}
          stroke="#000"
          strokeWidth="2"
        />

        {/* Visor */}
        <ellipse
          cx="26"
          cy="20"
          rx="10"
          ry="8"
          fill="#99d9ea"
          stroke="#000"
          strokeWidth="2"
        />

        {/* Visor shine */}
        <ellipse
          cx="29"
          cy="17"
          rx="3"
          ry="2"
          fill="#ffffff"
          opacity="0.6"
        />

        {/* Legs */}
        <ellipse
          cx="13"
          cy="46"
          rx="5"
          ry="4"
          fill={color.hex}
          stroke="#000"
          strokeWidth="2"
        />
        <ellipse
          cx="27"
          cy="46"
          rx="5"
          ry="4"
          fill={color.hex}
          stroke="#000"
          strokeWidth="2"
        />

        {/* Dead X eyes if not alive */}
        {!isAlive && (
          <>
            <line x1="22" y1="16" x2="30" y2="24" stroke="#ff0000" strokeWidth="2" />
            <line x1="30" y1="16" x2="22" y2="24" stroke="#ff0000" strokeWidth="2" />
          </>
        )}

        {/* Ghost effect */}
        {isGhost && (
          <circle cx="20" cy="10" r="8" fill="white" opacity="0.3" />
        )}
      </svg>

      {/* Player name */}
      {showName && name && (
        <span
          className="text-xs font-bold mt-1 px-1 rounded"
          style={{
            color: color.light,
            textShadow: "0 0 4px rgba(0,0,0,0.8)"
          }}
        >
          {name}
        </span>
      )}
    </motion.div>
  );
}

export function DeadBody({
  colorId,
  size = "md",
}: {
  colorId: number;
  size?: "sm" | "md" | "lg";
}) {
  const color = PlayerColors[colorId] || PlayerColors[0];
  const { width, height } = sizeMap[size];

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="relative"
    >
      <svg
        width={width}
        height={height * 0.6}
        viewBox="0 0 40 30"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Dead body - just lower half */}
        <ellipse
          cx="20"
          cy="15"
          rx="16"
          ry="12"
          fill={color.hex}
          stroke="#000"
          strokeWidth="2"
        />

        {/* Bone sticking out */}
        <ellipse
          cx="20"
          cy="5"
          rx="8"
          ry="3"
          fill="#e8e8e8"
          stroke="#000"
          strokeWidth="1"
        />

        {/* Blood pool */}
        <ellipse
          cx="20"
          cy="25"
          rx="18"
          ry="5"
          fill="#8B0000"
          opacity="0.7"
        />
      </svg>
    </motion.div>
  );
}
