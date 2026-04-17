import React from "react";

interface Project {
  id: string;
  name: string;
  genre: string;
  createdAt: string;
  status: string;
}

const MOCK_PROJECTS: Project[] = [
  { id: "1", name: "Lumber Tycoon Deluxe", genre: "tycoon", createdAt: "2026-04-15", status: "complete" },
  { id: "2", name: "Arena Showdown", genre: "battle_arena", createdAt: "2026-04-16", status: "generated" },
  { id: "3", name: "Dungeon Depths", genre: "adventure", createdAt: "2026-04-17", status: "draft" },
];

export function ProjectBrowser() {
  return (
    <div>
      <h2 style={{ fontSize: "20px", marginBottom: "16px" }}>Projects</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
        {MOCK_PROJECTS.map((p) => (
          <div
            key={p.id}
            style={{
              padding: "16px",
              background: "#111118",
              borderRadius: "8px",
              border: "1px solid #222",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "6px" }}>{p.name}</div>
            <div style={{ fontSize: "12px", color: "#888", display: "flex", gap: "12px" }}>
              <span>{p.genre}</span>
              <span>{p.createdAt}</span>
              <span style={{
                color: p.status === "complete" ? "#4ade80" : p.status === "generated" ? "#facc15" : "#888",
              }}>
                {p.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
