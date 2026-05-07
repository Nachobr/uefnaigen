import React, { useEffect, useState } from "react";
import { ProjectBrowser } from "./components/ProjectBrowser.js";
import { PromptWizard } from "./components/PromptWizard.js";
import { LayoutPreview } from "./components/LayoutPreview.js";
import type { WorldProject } from "@forgeai/schemas";

type View = "browser" | "create" | "preview";

export interface ProjectSummary {
  id: string;
  name: string;
  genre: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  path: string;
  jobId?: string;
  seed: number;
  zones: number;
  devices: number;
  scripts: number;
  warnings: number;
}

export interface ProjectDetails extends ProjectSummary {
  project: WorldProject;
  verseFiles: Array<{ name: string; code: string }>;
  manifests: Array<{ name: string; path: string }>;
}

export interface GenerationProgress {
  stage: number;
  name: string;
  detail: string;
}

interface GenerateProjectRequest {
  prompt: string;
  genre?: string;
  provider?: string;
  model?: string;
  outputDir?: string;
  budget?: number;
  repair?: boolean;
  strict?: boolean;
}

interface GenerateProjectResponse {
  project: ProjectDetails;
  jobId: string;
  outputPath: string;
  costUsd: number;
  warnings: number;
}

declare global {
  interface Window {
    forgeai: {
      listProjects: (outputDir?: string) => Promise<ProjectSummary[]>;
      readProject: (projectPath: string) => Promise<ProjectDetails>;
      generateProject: (request: GenerateProjectRequest) => Promise<GenerateProjectResponse>;
      listJobs: () => Promise<unknown[]>;
      onGenerationProgress: (callback: (progress: GenerationProgress) => void) => () => void;
    };
  }
}

export function App() {
  const [view, setView] = useState<View>("browser");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectDetails | null>(null);
  const [generationSummary, setGenerationSummary] = useState<GenerateProjectResponse | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshProjects() {
    setLoadingProjects(true);
    setError(null);
    try {
      setProjects(await window.forgeai.listProjects());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingProjects(false);
    }
  }

  async function openProject(path: string) {
    setError(null);
    try {
      const details = await window.forgeai.readProject(path);
      setSelectedProject(details);
      setView("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function handleGenerated(result: GenerateProjectResponse) {
    setSelectedProject(result.project);
    setGenerationSummary(result);
    setProjects((current) => [result.project, ...current.filter((p) => p.path !== result.project.path)]);
    setView("preview");
  }

  useEffect(() => {
    void refreshProjects();
  }, []);

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
        {error && (
          <div style={{ padding: "10px 12px", background: "#2a1114", border: "1px solid #7f1d1d", borderRadius: "8px", color: "#fca5a5", marginBottom: "16px" }}>
            {error}
          </div>
        )}
        {generationSummary && (
          <div style={{ padding: "10px 12px", background: "#101c14", border: "1px solid #166534", borderRadius: "8px", color: "#bbf7d0", marginBottom: "16px", fontSize: "13px" }}>
            Generated {generationSummary.project.name} · Job {generationSummary.jobId} · Cost ${generationSummary.costUsd.toFixed(4)} · {generationSummary.warnings} validation warnings · {generationSummary.outputPath}
          </div>
        )}
        {view === "browser" && (
          <ProjectBrowser
            projects={projects}
            selectedProjectPath={selectedProject?.path}
            loading={loadingProjects}
            onRefresh={refreshProjects}
            onOpenProject={openProject}
          />
        )}
        {view === "create" && <PromptWizard onGenerated={handleGenerated} />}
        {view === "preview" && <LayoutPreview project={selectedProject} />}
      </main>
    </div>
  );
}
