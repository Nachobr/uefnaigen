import { app, BrowserWindow, ipcMain } from "electron";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pipeline, JobManager } from "@forgeai/core";
import { loadConfig, WorldProject } from "@forgeai/schemas";
const __dirname = dirname(fileURLToPath(import.meta.url));
function toCliFlags(request) {
    return {
        provider: request.provider,
        model: request.model,
        out: request.outputDir,
        budget: request.budget,
    };
}
function toProjectSummary(project, projectPath) {
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
function readJob(projectPath) {
    const jobPath = join(projectPath, ".ai", "job.json");
    if (!existsSync(jobPath))
        return undefined;
    try {
        return JSON.parse(readFileSync(jobPath, "utf-8"));
    }
    catch {
        return undefined;
    }
}
function readProject(projectPath) {
    const manifestPath = join(projectPath, "manifests", "world.project.json");
    if (!existsSync(manifestPath))
        return undefined;
    try {
        return WorldProject.parse(JSON.parse(readFileSync(manifestPath, "utf-8")));
    }
    catch {
        return undefined;
    }
}
function findProjectDirs(root) {
    const dirs = new Set();
    const visit = (dir, depth) => {
        if (existsSync(join(dir, "manifests", "world.project.json"))) {
            dirs.add(dir);
            return;
        }
        if (depth <= 0 || !existsSync(dir))
            return;
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory() && !entry.name.startsWith(".")) {
                visit(join(dir, entry.name), depth - 1);
            }
        }
    };
    visit(root, 2);
    return Array.from(dirs);
}
function listProjects(outputDir) {
    const config = loadConfig(outputDir ? { out: outputDir } : {});
    const root = resolve(config.outputDir);
    return findProjectDirs(root)
        .map((projectPath) => {
        const project = readProject(projectPath);
        return project ? toProjectSummary(project, projectPath) : undefined;
    })
        .filter((project) => project !== undefined)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
function getProjectDetails(projectPath) {
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
    ipcMain.handle("forgeai:list-projects", (_event, outputDir) => listProjects(outputDir));
    ipcMain.handle("forgeai:read-project", (_event, projectPath) => getProjectDetails(projectPath));
    ipcMain.handle("forgeai:generate-project", async (event, request) => {
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
    }
    else {
        win.loadFile(join(__dirname, "../dist/index.html"));
    }
}
app.whenReady().then(() => {
    registerIpcHandlers();
    createWindow();
});
app.on("window-all-closed", () => {
    if (process.platform !== "darwin")
        app.quit();
});
app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0)
        createWindow();
});
//# sourceMappingURL=main.js.map