import { app, BrowserWindow } from "electron";
import { join } from "node:path";
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
        },
    });
    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
    }
    else {
        win.loadFile(join(__dirname, "../dist/index.html"));
    }
}
app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
    if (process.platform !== "darwin")
        app.quit();
});
app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0)
        createWindow();
});
//# sourceMappingURL=main.js.map