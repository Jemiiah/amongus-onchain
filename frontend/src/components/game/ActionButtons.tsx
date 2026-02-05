"use client";

import { motion } from "framer-motion";
import { Role } from "@/types/game";

interface ActionButtonsProps {
  role: Role;
  canKill?: boolean;
  canReport?: boolean;
  canVent?: boolean;
  canSabotage?: boolean;
  onKill?: () => void;
  onReport?: () => void;
  onVent?: () => void;
  onSabotage?: () => void;
  onUse?: () => void;
}

export function ActionButtons({
  role,
  canKill = false,
  canReport = false,
  canVent = false,
  canSabotage = false,
  onKill,
  onReport,
  onVent,
  onSabotage,
  onUse,
}: ActionButtonsProps) {
  const isImpostor = role === Role.Impostor;

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {/* Report Button */}
      <ActionButton
        label="REPORT"
        color="#ffa500"
        icon={<ReportIcon />}
        onClick={onReport}
        disabled={!canReport}
      />

      {/* Impostor-only buttons */}
      {isImpostor && (
        <>
          <ActionButton
            label="KILL"
            color="#ff0000"
            icon={<KillIcon />}
            onClick={onKill}
            disabled={!canKill}
          />
          <ActionButton
            label="SABOTAGE"
            color="#ff4444"
            icon={<SabotageIcon />}
            onClick={onSabotage}
            disabled={!canSabotage}
          />
          <ActionButton
            label="VENT"
            color="#666666"
            icon={<VentIcon />}
            onClick={onVent}
            disabled={!canVent}
          />
        </>
      )}

      {/* Use button for tasks */}
      <ActionButton
        label="USE"
        color="#4488ff"
        icon={<UseIcon />}
        onClick={onUse}
      />
    </div>
  );
}

interface ActionButtonProps {
  label: string;
  color: string;
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

function ActionButton({ label, color, icon, onClick, disabled }: ActionButtonProps) {
  return (
    <motion.button
      className="relative w-20 h-20 rounded-xl overflow-hidden"
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.1 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      style={{
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -40)} 100%)`,
          border: `3px solid ${adjustColor(color, -60)}`,
          borderRadius: "12px",
        }}
      />

      {/* Shine effect */}
      <div
        className="absolute top-0 left-0 right-0 h-1/3 opacity-30"
        style={{
          background: "linear-gradient(180deg, white 0%, transparent 100%)",
          borderRadius: "12px 12px 0 0",
        }}
      />

      {/* Content */}
      <div className="relative flex flex-col items-center justify-center h-full p-1">
        <div className="w-10 h-10 flex items-center justify-center">
          {icon}
        </div>
        <span
          className="text-white text-[10px] font-bold mt-1"
          style={{
            textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
            fontFamily: "'Comic Sans MS', cursive",
          }}
        >
          {label}
        </span>
      </div>
    </motion.button>
  );
}

// Helper to darken/lighten colors
function adjustColor(color: string, amount: number): string {
  const hex = color.replace("#", "");
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// Icons
function ReportIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
      <path
        d="M20 5 L35 15 L35 35 L5 35 L5 15 Z"
        fill="#fff"
        stroke="#333"
        strokeWidth="2"
      />
      <text x="20" y="28" textAnchor="middle" fill="#ff0000" fontSize="16" fontWeight="bold">!</text>
    </svg>
  );
}

function KillIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
      {/* Skull */}
      <circle cx="20" cy="18" r="12" fill="#fff" stroke="#333" strokeWidth="2" />
      <circle cx="15" cy="16" r="3" fill="#333" />
      <circle cx="25" cy="16" r="3" fill="#333" />
      <path d="M14 24 Q20 28 26 24" stroke="#333" strokeWidth="2" fill="none" />
      {/* Crossbones */}
      <path d="M8 32 L32 38" stroke="#fff" strokeWidth="3" />
      <path d="M32 32 L8 38" stroke="#fff" strokeWidth="3" />
    </svg>
  );
}

function SabotageIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
      {/* Warning triangle */}
      <path
        d="M20 5 L38 35 L2 35 Z"
        fill="#fff"
        stroke="#333"
        strokeWidth="2"
      />
      <path d="M20 14 L20 24" stroke="#ff0000" strokeWidth="4" strokeLinecap="round" />
      <circle cx="20" cy="30" r="2" fill="#ff0000" />
    </svg>
  );
}

function VentIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
      {/* Vent grate */}
      <rect x="5" y="10" width="30" height="20" fill="#444" stroke="#333" strokeWidth="2" rx="2" />
      <line x1="10" y1="10" x2="10" y2="30" stroke="#222" strokeWidth="2" />
      <line x1="17" y1="10" x2="17" y2="30" stroke="#222" strokeWidth="2" />
      <line x1="24" y1="10" x2="24" y2="30" stroke="#222" strokeWidth="2" />
      <line x1="31" y1="10" x2="31" y2="30" stroke="#222" strokeWidth="2" />
    </svg>
  );
}

function UseIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
      {/* Hand icon */}
      <path
        d="M20 35 L20 20 M15 25 L20 20 L25 25"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="12" r="6" fill="#fff" stroke="#333" strokeWidth="2" />
    </svg>
  );
}
