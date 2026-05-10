import { app, BrowserWindow, ipcMain } from "electron";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pipeline, JobManager, Modifier, type ModifierResult } from "@forgeai/core";
import { loadConfig, WorldProject, type CLIFlags, type WorldProject as WorldProjectType } from "@forgeai/schemas";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

interface ModifyProjectRequest {
  projectDir: string;
  request: string;
  provider?: string;
  model?: string;
  outputDir?: string;
  budget?: number;
  dryRun?: boolean;
  force?: boolean;
  repair?: boolean;
  strict?: boolean;
}

interface ProjectSummary {
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

interface ProjectDetails extends ProjectSummary {
  project: WorldProjectType;
  verseFiles: Array<{ name: string; code: string }>;
  manifests: Array<{ name: string; path: string }>;
}

interface AdapterRequest {
  provider?: string;
  model?: string;
  outputDir?: string;
  budget?: number;
}

function modifierResultSummary(result: ModifierResult): Record<string, unknown> {
  return {
    patch: result.patch,
    validation: result.validation,
    costUsd: result.costUsd,
    changedFiles: result.changedFiles,
    jobId: result.jobId,
    outputPath: result.outputPath,
  };
}

function toCliFlags(request: AdapterRequest): CLIFlags {
  return {
    provider: request.provider,
    model: request.model,
    out: request.outputDir,
    budget: request.budget,
  };
}

function toProjectSummary(project: WorldProjectType, projectPath: string): ProjectSummary {
  const job = readJob(projectPath);
  return {
    id: project.projectId,
    name: project.name,
    genre: project.target.genre,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    status: job?.status ?? "complete",
    path: projectPath,
    jobId: job?.jobId,
    seed: project.source.seed,
    zones: project.layout.zones.length,
    devices: project.devices.length,
    scripts: project.scripts.length,
    warnings: project.validation.reduce((count, result) => count + (result.warnings?.length ?? 0), 0),
  };
}

function readJob(projectPath: string): { jobId?: string; status?: string } | undefined {
  const jobPath = join(projectPath, ".ai", "job.json");
  if (!existsSync(jobPath)) return undefined;
  try {
    return JSON.parse(readFileSync(jobPath, "utf-8")) as { jobId?: string; status?: string };
  } catch {
    return undefined;
  }
}

function readProject(projectPath: string): WorldProjectType | undefined {
  const manifestPath = join(projectPath, "manifests", "world.project.json");
  if (!existsSync(manifestPath)) return undefined;
  try {
    return WorldProject.parse(JSON.parse(readFileSync(manifestPath, "utf-8")));
  } catch {
    return undefined;
  }
}

function findProjectDirs(root: string): string[] {
  const dirs = new Set<string>();
  const visit = (dir: string, depth: number) => {
    if (existsSync(join(dir, "manifests", "world.project.json"))) {
      dirs.add(dir);
      return;
    }
    if (depth <= 0 || !existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        visit(join(dir, entry.name), depth - 1);
      }
    }
  };

  visit(root, 2);
  return Array.from(dirs);
}

function listProjects(outputDir?: string): ProjectSummary[] {
  const config = loadConfig(outputDir ? { out: outputDir } : {});
  const root = resolve(config.outputDir);
  return findProjectDirs(root)
    .map((projectPath) => {
      const project = readProject(projectPath);
      return project ? toProjectSummary(project, projectPath) : undefined;
    })
    .filter((project): project is ProjectSummary => project !== undefined)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function getProjectDetails(projectPath: string): ProjectDetails {
  const resolvedPath = resolve(projectPath);
  const project = readProject(resolvedPath);
  if (!project) {
    throw new Error(`Generated project not found at ${resolvedPath}`);
  }

  const verseDir = join(resolvedPath, "Verse");
  const verseFiles = existsSync(verseDir)
    ? readdirSync(verseDir)
      .filter((name) => name.endsWith(".verse"))
      .sort()
      .map((name) => ({ name, code: readFileSync(join(verseDir, name), "utf-8") }))
    : [];
  const manifestsDir = join(resolvedPath, "manifests");
  const manifests = existsSync(manifestsDir)
    ? readdirSync(manifestsDir)
      .filter((name) => name.endsWith(".json"))
      .sort()
      .map((name) => ({ name, path: join(manifestsDir, name) }))
    : [];

  return {
    ...toProjectSummary(project, resolvedPath),
    project,
    verseFiles,
    manifests,
  };
}

function registerIpcHandlers() {
  ipcMain.handle("forgeai:list-projects", (_event, outputDir?: string) => listProjects(outputDir));
  ipcMain.handle("forgeai:read-project", (_event, projectPath: string) => getProjectDetails(projectPath));
  ipcMain.handle("forgeai:generate-project", async (event, request: GenerateProjectRequest) => {
    const config = loadConfig(toCliFlags(request));
    const seed = Math.floor(Math.random() * 1_000_000);
    const outputDir = resolve(request.outputDir?.trim() || config.outputDir);
    const pipeline = new Pipeline({
      prompt: request.prompt,
      seed,
      genre: request.genre,
      outputDir,
      config,
      repair: request.repair,
      strict: request.strict,
      onStage: (stage, name, detail) => {
        event.sender.send("forgeai:generation-progress", { stage, name, detail });
      },
    });

    const result = await pipeline.run();
    const details = getProjectDetails(result.outputPath);
    return {
      project: details,
      jobId: result.job.jobId,
      outputPath: result.outputPath,
      costUsd: pipeline.totalSpentUsd,
      warnings: result.validation.reduce((count, validation) => count + validation.warnings.length, 0),
    };
  });
  ipcMain.handle("forgeai:modify-project", async (_event, request: ModifyProjectRequest) => {
    const config = loadConfig(toCliFlags(request));
    const modifier = new Modifier({
      projectDir: request.projectDir,
      request: request.request,
      config,
      outputDir: request.outputDir?.trim() || undefined,
      dryRun: request.dryRun,
      force: request.force,
      repair: request.repair,
      strict: request.strict,
    });

    const result = await modifier.run();
    return {
      ...modifierResultSummary(result),
      project: request.dryRun ? undefined : getProjectDetails(result.outputPath),
    };
  });
  ipcMain.handle("forgeai:list-jobs", () => new JobManager().listAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "ForgeAI",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, "preload.js"),
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
