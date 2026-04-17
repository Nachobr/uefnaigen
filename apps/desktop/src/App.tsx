import React, { useState } from "react";
import { ProjectBrowser } from "./components/ProjectBrowser.js";
import { PromptWizard } from "./components/PromptWizard.js";
import { LayoutPreview } from "./components/LayoutPreview.js";

type View = "browser" | "create" | "preview";

export function App() {
  const [view, setView] = useState<View>("browser");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <header style={{
        padding: "12px 20px",
        background: "#111118",
        borderBottom: "1px solid #222",
        display: "flex",
        alignItems: "center",
        gap: "16px",
      }}>
        <h1 style={{ fontSize: "18px", fontWeight: 600, color: "#7c5cff" }}>
          ⚡ ForgeAI
        </h1>
        <nav style={{ display: "flex", gap: "8px" }}>
          {(["browser", "create", "preview"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                background: view === v ? "#7c5cff" : "#1a1a24",
                color: view === v ? "#fff" : "#888",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 500,
              }}
            >
              {v === "browser" ? "Projects" : v === "create" ? "Create" : "Preview"}
            </button>
          ))}
        </nav>
      </header>

      <main style={{ flex: 1, overflow: "auto", padding: "20px" }}>
        {view === "browser" && <ProjectBrowser />}
        {view === "create" && <PromptWizard />}
        {view === "preview" && <LayoutPreview />}
      </main>
    </div>
  );
}
