import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("forgeai", {
  listProjects: (outputDir?: string) => ipcRenderer.invoke("forgeai:list-projects", outputDir),
  readProject: (projectPath: string) => ipcRenderer.invoke("forgeai:read-project", projectPath),
  generateProject: (request: unknown) => ipcRenderer.invoke("forgeai:generate-project", request),
  modifyProject: (request: unknown) => ipcRenderer.invoke("forgeai:modify-project", request),
  listJobs: () => ipcRenderer.invoke("forgeai:list-jobs"),
  onGenerationProgress: (callback: (progress: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: unknown) => callback(progress);
    ipcRenderer.on("forgeai:generation-progress", listener);
    return () => ipcRenderer.removeListener("forgeai:generation-progress", listener);
  },
});
