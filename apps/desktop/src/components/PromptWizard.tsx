import React, { useState } from "react";
import type { GenerationProgress } from "../App.js";

interface PromptWizardProps {
  onGenerated: (result: Awaited<ReturnType<typeof window.forgeai.generateProject>>) => void;
}

const GENRES = ["tycoon", "battle_arena", "adventure", "roleplay"] as const;

export function PromptWizard({ onGenerated }: PromptWizardProps) {
  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState<string>("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [outputDir, setOutputDir] = useState("");
  const [budget, setBudget] = useState("");
  const [repair, setRepair] = useState(false);
  const [strict, setStrict] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!prompt.trim() || running) return;
    setRunning(true);
    setError(null);
    setProgress([]);
    const unsubscribe = window.forgeai.onGenerationProgress((event) => {
      setProgress((current) => [...current, event]);
    });
    try {
      const result = await window.forgeai.generateProject({
        prompt: prompt.trim(),
        genre: genre || undefined,
        provider: provider.trim() || undefined,
        model: model.trim() || undefined,
        outputDir: outputDir.trim() || undefined,
        budget: budget.trim() ? Number(budget) : undefined,
        repair,
        strict,
      });
      onGenerated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      unsubscribe();
      setRunning(false);
    }
  }

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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "16px" }}>
        <div>
          <label style={{ display: "block", fontSize: "13px", color: "#888", marginBottom: "6px" }}>Provider override</label>
          <input
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="groq, google, anthropic..."
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "13px", color: "#888", marginBottom: "6px" }}>Model override</label>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Use config default"
            style={inputStyle}
          />
        </div>
      </div>

      <label style={{ display: "block", fontSize: "13px", color: "#888", marginTop: "16px", marginBottom: "6px" }}>
        Output directory
      </label>
      <input
        value={outputDir}
        onChange={(e) => setOutputDir(e.target.value)}
        placeholder="Use ~/.forgeai/config.yaml outputDir"
        style={inputStyle}
      />

      <div style={{ display: "flex", gap: "16px", alignItems: "center", marginTop: "16px", flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#888" }}>
          <input type="checkbox" checked={repair} onChange={(e) => setRepair(e.target.checked)} />
          Run repair loop on validation failures
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#888" }}>
          <input type="checkbox" checked={strict} onChange={(e) => setStrict(e.target.checked)} />
          Strict validation warnings
        </label>
        <input
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="Budget USD"
          type="number"
          min="0"
          step="0.01"
          style={{ ...inputStyle, width: "120px" }}
        />
      </div>

      <button
        onClick={generate}
        disabled={!prompt.trim() || running}
        style={{
          marginTop: "20px",
          padding: "10px 24px",
          borderRadius: "8px",
          border: "none",
          background: prompt.trim() && !running ? "#7c5cff" : "#333",
          color: prompt.trim() && !running ? "#fff" : "#666",
          cursor: prompt.trim() && !running ? "pointer" : "not-allowed",
          fontSize: "14px",
          fontWeight: 600,
        }}
      >
        {running ? "Generating..." : "⚡ Generate Project"}
      </button>

      {error && (
        <div style={{ marginTop: "16px", padding: "10px 12px", background: "#2a1114", border: "1px solid #7f1d1d", borderRadius: "8px", color: "#fca5a5", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {progress.length > 0 && (
        <div style={{ marginTop: "16px", background: "#111118", border: "1px solid #222", borderRadius: "8px", overflow: "hidden" }}>
          {progress.slice(-8).map((event, index) => (
            <div key={`${event.stage}-${index}`} style={{ padding: "8px 10px", borderBottom: index === progress.slice(-8).length - 1 ? "none" : "1px solid #1f1f2a", fontSize: "12px" }}>
              <span style={{ color: "#7c5cff", fontWeight: 600 }}>[{event.stage}/8] {event.name}</span>
              <span style={{ color: "#888" }}> — {event.detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 10px",
  background: "#111118",
  border: "1px solid #333",
  borderRadius: "8px",
  color: "#e0e0e0",
  fontSize: "13px",
  fontFamily: "inherit",
};
