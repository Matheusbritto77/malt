import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "out", "win");

async function main() {
    console.log("==> Building Moltbot for Windows...");

    // 1. Ensure fresh build
    console.log("--> Running builds...");
    // Use pnpm to ensure we build everything including UI and skills dependencies
    execSync("pnpm build", { cwd: root, stdio: "inherit" });
    execSync("pnpm ui:build", { cwd: root, stdio: "inherit" });

    // 2. Prepare output directory
    if (fs.existsSync(outDir)) {
        fs.rmSync(outDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outDir, { recursive: true });

    // 3. Package with pkg
    console.log("--> Packaging with pkg...");
    // We use node22 to match the project's engines requirement
    try {
        execSync(`npx pkg . --targets node22-win-x64 --output ${path.join(outDir, "moltbot.exe")} --public`, {
            cwd: root,
            stdio: "inherit"
        });
    } catch (err) {
        console.error("pkg failed. Make sure all external assets are correctly handled.");
        throw err;
    }

    // 4. Copy folders that are needed at runtime but not bundled or better kept external
    console.log("--> Copying assets...");
    const foldersToCopy = ["docs", "assets", "skills", "patches"];
    for (const folder of foldersToCopy) {
        const src = path.join(root, folder);
        const dest = path.join(outDir, folder);
        if (fs.existsSync(src)) {
            console.log(`    Copying ${folder}...`);
            fs.cpSync(src, dest, { recursive: true });
        }
    }

    // Copy UI dist (served by gateway)
    const uiSrc = path.join(root, "ui", "dist");
    const uiDest = path.join(root, "ui", "dist"); // Keep internal structure relative to root if possible

    // Actually, the gateway looks for 'ui/dist' relative to the process cwd or package root.
    // In the packaged app, we should probably place it where the app expects.
    const packagedUiDir = path.join(outDir, "ui", "dist");
    if (fs.existsSync(uiSrc)) {
        console.log("    Copying UI assets...");
        fs.mkdirSync(path.dirname(packagedUiDir), { recursive: true });
        fs.cpSync(uiSrc, packagedUiDir, { recursive: true });
    }

    // 5. Gather native modules (.node files)
    console.log("--> Gathering native modules...");
    const nativeDeps = ["@lydell", "sharp", "sqlite-vec", "@napi-rs", "node-llama-cpp"];
    const nodeModulesDest = path.join(outDir, "node_modules");
    fs.mkdirSync(nodeModulesDest, { recursive: true });

    for (const dep of nativeDeps) {
        const depSrc = path.join(root, "node_modules", dep);
        const depDest = path.join(nodeModulesDest, dep);
        if (fs.existsSync(depSrc)) {
            console.log(`    Copying native dep: ${dep}`);
            fs.cpSync(depSrc, depDest, { recursive: true });
        }
    }

    // Copy moltbot.mjs as it might be needed for some entry points if they spawn themselves
    fs.copyFileSync(path.join(root, "moltbot.mjs"), path.join(outDir, "moltbot.mjs"));

    console.log(`\n==> Done! Windows build available in: ${outDir}`);
    console.log("To run: out/win/moltbot.exe status");
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
