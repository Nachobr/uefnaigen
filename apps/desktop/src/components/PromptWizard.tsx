import React, { useState } from "react";

const GENRES = ["tycoon", "battle_arena", "adventure", "roleplay"] as const;

export function PromptWizard() {
  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState<string>("");

  return (
    <div style={{ maxWidth: "640px" }}>
      <h2 style={{ fontSize: "20px", marginBottom: "16px" }}>Create New Project</h2>

      <label style={{ display: "block", fontSize: "13px", color: "#888", marginBottom: "6px" }}>
        Describe your game idea
      </label>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="A colorful lumber tycoon for 8 players. Chop trees, sell logs, unlock sawmills..."
        rows={4}
        style={{
          width: "100%",
          padding: "12px",
          background: "#111118",
          border: "1px solid #333",
          borderRadius: "8px",
          color: "#e0e0e0",
          fontSize: "14px",
          resize: "vertical",
          fontFamily: "inherit",
        }}
      />

      <label style={{ display: "block", fontSize: "13px", color: "#888", marginTop: "16px", marginBottom: "6px" }}>
        Genre (optional — auto-detected from prompt)
      </label>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {GENRES.map((g) => (
          <button
            key={g}
            onClick={() => setGenre(genre === g ? "" : g)}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: genre === g ? "1px solid #7c5cff" : "1px solid #333",
              background: genre === g ? "#1a1530" : "#111118",
              color: genre === g ? "#7c5cff" : "#888",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            {g.replace("_", " ")}
          </button>
        ))}
      </div>

      <button
        disabled={!prompt.trim()}
        style={{
          marginTop: "20px",
          padding: "10px 24px",
          borderRadius: "8px",
          border: "none",
          background: prompt.trim() ? "#7c5cff" : "#333",
          color: prompt.trim() ? "#fff" : "#666",
          cursor: prompt.trim() ? "pointer" : "not-allowed",
          fontSize: "14px",
          fontWeight: 600,
        }}
      >
        ⚡ Generate Project
      </button>
    </div>
  );
}
