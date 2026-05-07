import React from "react";
import type { ProjectSummary } from "../App.js";

interface ProjectBrowserProps {
  projects: ProjectSummary[];
  selectedProjectPath?: string;
  loading: boolean;
  onRefresh: () => void;
  onOpenProject: (path: string) => void;
}

export function ProjectBrowser({ projects, selectedProjectPath, loading, onRefresh, onOpenProject }: ProjectBrowserProps) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div>
          <h2 style={{ fontSize: "20px", marginBottom: "4px" }}>Projects</h2>
          <div style={{ fontSize: "12px", color: "#666" }}>Generated scaffolds discovered from your configured output directory.</div>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          style={{
            padding: "7px 12px",
            borderRadius: "6px",
            border: "1px solid #333",
            background: "#111118",
            color: "#ccc",
            cursor: loading ? "wait" : "pointer",
            fontSize: "13px",
          }}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {!loading && projects.length === 0 && (
        <div style={{ padding: "24px", background: "#111118", border: "1px solid #222", borderRadius: "8px", color: "#888" }}>
          No generated projects found yet. Create one from the Create tab or run the CLI with your configured output directory.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
        {projects.map((p) => (
          <div
            key={p.path}
            onClick={() => onOpenProject(p.path)}
            style={{
              padding: "16px",
              background: "#111118",
              borderRadius: "8px",
              border: selectedProjectPath === p.path ? "1px solid #7c5cff" : "1px solid #222",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "6px" }}>{p.name}</div>
            <div style={{ fontSize: "12px", color: "#888", display: "flex", gap: "12px" }}>
              <span>{p.genre}</span>
              <span>{new Date(p.createdAt).toLocaleDateString()}</span>
              <span style={{
                color: p.status === "complete" ? "#4ade80" : p.status === "generated" ? "#facc15" : "#888",
              }}>
                {p.status}
              </span>
            </div>
            <div style={{ fontSize: "11px", color: "#666", display: "flex", gap: "10px", marginTop: "10px" }}>
              <span>{p.zones} zones</span>
              <span>{p.devices} devices</span>
              <span>{p.scripts} Verse</span>
              {p.warnings > 0 && <span style={{ color: "#facc15" }}>{p.warnings} warnings</span>}
            </div>
            <div style={{ fontSize: "10px", color: "#555", marginTop: "8px", wordBreak: "break-all" }}>{p.path}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
