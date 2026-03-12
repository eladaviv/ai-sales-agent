import React from "react";

// ─── Tag / badge ──────────────────────────────────────────────────────────────
interface TagProps {
  children: React.ReactNode;
  variant?: "default" | "blue" | "green" | "amber" | "red";
}

export function Tag({ children, variant = "default" }: TagProps) {
  return (
    <span className={`tag${variant !== "default" ? ` tag--${variant}` : ""}`}>
      {children}
    </span>
  );
}

// ─── Dot indicator ────────────────────────────────────────────────────────────
interface DotProps {
  color: string;
  pulse?: boolean;
}

export function Dot({ color, pulse = false }: DotProps) {
  return (
    <span
      className={`dot${pulse ? " dot--pulse" : ""}`}
      style={{ background: color }}
    />
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
export function Divider() {
  return <div className="divider" />;
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
interface SpinnerProps {
  size?: number;
  color?: string;
}

export function Spinner({ size = 24, color = "var(--blue)" }: SpinnerProps) {
  return (
    <div
      style={{
        width:       size,
        height:      size,
        borderRadius: "50%",
        border:      `2px solid var(--border)`,
        borderTop:   `2px solid ${color}`,
        animation:   "spin 0.9s linear infinite",
        flexShrink:  0,
      }}
    />
  );
}

// ─── Mono label ───────────────────────────────────────────────────────────────
interface LabelProps {
  children: React.ReactNode;
  variant?: "default" | "blue" | "green" | "amber";
  style?: React.CSSProperties;
}

export function Label({ children, variant = "default", style }: LabelProps) {
  return (
    <div
      className={`label${variant !== "default" ? ` label--${variant}` : ""}`}
      style={style}
    >
      {children}
    </div>
  );
}
