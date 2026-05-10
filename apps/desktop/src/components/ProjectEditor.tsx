import React, { useState } from "react";
import type { ModifyProjectResponse, ProjectDetails } from "../App.js";

interface ProjectEditorProps {
  project: ProjectDetails | null;
  onModified: (result: ModifyProjectResponse) => void;
}

export function ProjectEditor({ project, onModified }: ProjectEditorProps) {
  const [request, setRequest] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [outputDir, setOutputDir] = useState("");
  const [budget, setBudget] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [force, setForce] = useState(false);
  const [repair, setRepair] = useState(true);
  const [strict, setStrict] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ModifyProjectResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function modify() {
    if (!project || !request.trim() || running) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const response = await window.forgeai.modifyProject({
        projectDir: project.path,
        request: request.trim(),
        provider: provider.trim() || undefined,
        model: model.trim() || undefined,
        outputDir: outputDir.trim() || undefined,
        budget: budget.trim() ? Number(budget) : undefined,
        dryRun,
        force,
        repair,
        strict,
      });
      setResult(response);
      onModified(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  if (!project) {
    return (
      <div style={panelStyle}>
        <h2 style={{ fontSize: "20px", marginBottom: "8px" }}>Edit Project</h2>
        <div style={{ fontSize: "13px", color: "#888" }}>Open a generated project first, then return here to request a constrained AI modification.</div>
      </div>
    );
  }

  const passed = result?.validation.filter((v) => v.passed).length ?? 0;
  const warnings = result?.validation.reduce((count, v) => count + v.warnings.length, 0) ?? 0;

  return (
    <div style={{ maxWidth: "760px" }}>
      <h2 style={{ fontSize: "20px", marginBottom: "6px" }}>Edit Project</h2>
      <div style={{ fontSize: "12px", color: "#666", marginBottom: "16px" }}>
        {project.name} · {project.genre} · {project.path}
      </div>

      <label style={labelStyle}>Describe the change</label>
      <textarea
        value={request}
        onChange={(e) => setRequest(e.target.value)}
        placeholder="Add a snowy premium forest zone with a more expensive late-game generator..."
        rows={4}
        style={{ ...inputStyle, resize: "vertical", fontSize: "14px" }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "16px" }}>
        <div>
          <label style={labelStyle}>Provider override</label>
          <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Use config default" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Model override</label>
          <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Use config default" style={inputStyle} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: "12px", marginTop: "16px" }}>
        <div>
          <label style={labelStyle}>Output directory</label>
          <input value={outputDir} onChange={(e) => setOutputDir(e.target.value)} placeholder="Blank edits in place; set a path to write a modified copy" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Budget USD</label>
          <input value={budget} onChange={(e) => setBudget(e.target.value)} type="number" min="0" step="0.01" placeholder="0.25" style={inputStyle} />
        </div>
      </div>

      <div style={{ display: "flex", gap: "16px", alignItems: "center", marginTop: "16px", flexWrap: "wrap" }}>
        <label style={checkboxStyle}>
          <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
          Dry run first
        </label>
        <label style={checkboxStyle}>
          <input type="checkbox" checked={repair} onChange={(e) => setRepair(e.target.checked)} />
          Repair validation failures
        </label>
        <label style={checkboxStyle}>
          <input type="checkbox" checked={strict} onChange={(e) => setStrict(e.target.checked)} />
          Strict warnings
        </label>
        <label style={checkboxStyle}>
          <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
          Force over human edits
        </label>
      </div>

      <button
        onClick={modify}
        disabled={!request.trim() || running}
        style={{
          marginTop: "20px",
          padding: "10px 24px",
          borderRadius: "8px",
          border: "none",
          background: request.trim() && !running ? "#7c5cff" : "#333",
          color: request.trim() && !running ? "#fff" : "#666",
          cursor: request.trim() && !running ? "pointer" : "not-allowed",
          fontSize: "14px",
          fontWeight: 600,
        }}
      >
        {running ? "Modifying..." : dryRun ? "Plan Modification" : "Apply Modification"}
      </button>

      {error && (
        <div style={{ marginTop: "16px", padding: "10px 12px", background: "#2a1114", border: "1px solid #7f1d1d", borderRadius: "8px", color: "#fca5a5", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ ...panelStyle, marginTop: "16px" }}>
          <div style={{ fontSize: "14px", color: "#ddd", fontWeight: 600, marginBottom: "6px" }}>{result.patch.summary}</div>
          <div style={{ fontSize: "12px", color: "#888", marginBottom: "10px" }}>
            Job {result.jobId} · Cost ${result.costUsd.toFixed(4)} · Validation {passed}/{result.validation.length} passed{warnings > 0 ? ` (${warnings} warnings)` : ""}
          </div>
          <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>Changed files</div>
          {result.changedFiles.map((file) => (
            <div key={file} style={{ fontSize: "11px", color: "#666", marginBottom: "3px" }}>{file}</div>
          ))}
          {!result.project && <div style={{ fontSize: "12px", color: "#facc15", marginTop: "10px" }}>Dry run only — uncheck “Dry run first” to write the modification.</div>}
        </div>
      )}
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  padding: "16px",
  background: "#111118",
  border: "1px solid #222",
  borderRadius: "8px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  color: "#888",
  marginBottom: "6px",
};

const checkboxStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "13px",
  color: "#888",
};

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
