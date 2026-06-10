import { Command } from "commander";
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

interface InstallOptions {
  project?: string;
  force?: boolean;
}

export const liveCommand = new Command("live")
  .description("Manage ForgeAI Live UEFN integration")
  .addCommand(
    new Command("install")
      .description("Install the ForgeAI UEFN listener into a UEFN project")
      .requiredOption("--project <dir>", "UEFN project directory")
      .option("--force", "Overwrite existing listener files", false)
      .action((options: InstallOptions) => {
        installLiveListener(options);
      }),
  );

function installLiveListener(options: InstallOptions): void {
  if (!options.project) throw new Error("--project is required");
  if (!existsSync(options.project) || !statSync(options.project).isDirectory()) {
    console.error(`✗ Project directory does not exist: ${options.project}`);
    process.exitCode = 1;
    return;
  }

  const markers = findProjectMarkers(options.project);
  if (markers.length === 0) {
    console.warn(`! No .uefnproject/*.uproject marker found in ${options.project}; checked top-level project files and continuing.`);
  }

  const vendorDir = resolveVendorDir();
  const pythonDir = join(options.project, "Content", "Python");
  const files = ["uefn_listener.py", "init_unreal.py"];
  const existing = files.map((file) => join(pythonDir, file)).filter((path) => existsSync(path));
  if (existing.length > 0 && !options.force) {
    console.error("✗ Listener file(s) already exist; rerun with --force to overwrite:");
    for (const path of existing) console.error(`- ${path}`);
    process.exitCode = 1;
    return;
  }

  mkdirSync(pythonDir, { recursive: true });
  for (const file of files) {
    copyFileSync(join(vendorDir, file), join(pythonDir, file));
  }
  console.log(`✓ Installed ForgeAI listener into ${pythonDir}`);
}

function findProjectMarkers(projectDir: string): string[] {
  return readdirSync(projectDir)
    .filter((entry) => entry === ".uefnproject" || /\.(uefnproject|uproject)$/i.test(entry))
    .map((entry) => join(projectDir, entry));
}

function resolveVendorDir(): string {
  const candidates = [
    fileURLToPath(new URL("../vendor/uefn-mcp", import.meta.url)),
    join(process.cwd(), "vendor", "uefn-mcp"),
    fileURLToPath(new URL("../../../../vendor/uefn-mcp", import.meta.url)),
  ];
  const found = candidates.find((path) => existsSync(join(path, "uefn_listener.py")) && existsSync(join(path, "init_unreal.py")));
  if (!found) throw new Error(`Could not find vendored UEFN listener; checked ${candidates.join(", ")}`);
  return found;
}
