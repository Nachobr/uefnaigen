import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("forgeai", {
    listProjects: (outputDir) => ipcRenderer.invoke("forgeai:list-projects", outputDir),
    readProject: (projectPath) => ipcRenderer.invoke("forgeai:read-project", projectPath),
    generateProject: (request) => ipcRenderer.invoke("forgeai:generate-project", request),
    listJobs: () => ipcRenderer.invoke("forgeai:list-jobs"),
    onGenerationProgress: (callback) => {
        const listener = (_event, progress) => callback(progress);
        ipcRenderer.on("forgeai:generation-progress", listener);
        return () => ipcRenderer.removeListener("forgeai:generation-progress", listener);
    },
});
//# sourceMappingURL=preload.js.map