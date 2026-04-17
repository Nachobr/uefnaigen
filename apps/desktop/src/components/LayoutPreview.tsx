import React from "react";

interface Zone {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

const MOCK_ZONES: Zone[] = [
  { id: "z1", name: "Spawn Hub", x: 200, y: 200, w: 120, h: 120, color: "#4ade80" },
  { id: "z2", name: "Forest", x: 50, y: 50, w: 100, h: 100, color: "#22c55e" },
  { id: "z3", name: "Sawmill", x: 350, y: 50, w: 100, h: 80, color: "#f59e0b" },
  { id: "z4", name: "Market", x: 350, y: 280, w: 100, h: 80, color: "#3b82f6" },
  { id: "z5", name: "Upgrade Lane", x: 50, y: 280, w: 100, h: 80, color: "#a855f7" },
];

export function LayoutPreview() {
  return (
    <div>
      <h2 style={{ fontSize: "20px", marginBottom: "16px" }}>Layout Preview</h2>
      <div style={{
        position: "relative",
        width: "500px",
        height: "420px",
        background: "#111118",
        borderRadius: "8px",
        border: "1px solid #222",
        overflow: "hidden",
      }}>
        {MOCK_ZONES.map((z) => (
          <div
            key={z.id}
            style={{
              position: "absolute",
              left: z.x,
              top: z.y,
              width: z.w,
              height: z.h,
              background: z.color + "22",
              border: `2px solid ${z.color}`,
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontWeight: 600,
              color: z.color,
            }}
          >
            {z.name}
          </div>
        ))}
      </div>
      <p style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
        2D zone grid visualization — connects to generated layout data
      </p>
    </div>
  );
}
