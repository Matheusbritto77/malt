import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const HASH_FILE = path.join(ROOT_DIR, "src", "canvas-host", "a2ui", ".bundle.hash");
const OUTPUT_FILE = path.join(ROOT_DIR, "src", "canvas-host", "a2ui", "a2ui.bundle.js");
const A2UI_RENDERER_DIR = path.join(ROOT_DIR, "vendor", "a2ui", "renderers/lit");
const A2UI_APP_DIR = path.join(ROOT_DIR, "apps", "shared", "MoltbotKit", "Tools", "CanvasA2UI");

async function walk(entryPath: string, files: string[]) {
    const st = await fs.stat(entryPath);
    if (st.isDirectory()) {
        const entries = await fs.readdir(entryPath);
        for (const entry of entries) {
            await walk(path.join(entryPath, entry), files);
        }
        return;
    }
    files.push(entryPath);
}

async function main() {
    // Docker builds exclude vendor/apps via .dockerignore.
    // In that environment we must keep the prebuilt bundle.
    if (!existsSync(A2UI_RENDERER_DIR) || !existsSync(A2UI_APP_DIR)) {
        console.log("A2UI sources missing; keeping prebuilt bundle.");
        return;
    }

    const INPUT_PATHS = [
        path.join(ROOT_DIR, "package.json"),
        path.join(ROOT_DIR, "pnpm-lock.yaml"),
        A2UI_RENDERER_DIR,
        A2UI_APP_DIR,
    ];

    const files: string[] = [];
    for (const input of INPUT_PATHS) {
        if (existsSync(input)) {
            await walk(input, files);
        }
    }

    const normalize = (p: string) => p.split(path.sep).join("/");
    files.sort((a, b) => normalize(a).localeCompare(normalize(b)));

    const hash = createHash("sha256");
    for (const filePath of files) {
        const rel = normalize(path.relative(ROOT_DIR, filePath));
        hash.update(rel);
        hash.update("\0");
        hash.update(await fs.readFile(filePath));
        hash.update("\0");
    }

    const currentHash = hash.digest("hex");

    if (existsSync(HASH_FILE)) {
        const previousHash = await fs.readFile(HASH_FILE, "utf-8");
        if (previousHash.trim() === currentHash && existsSync(OUTPUT_FILE)) {
            console.log("A2UI bundle up to date; skipping.");
            return;
        }
    }

    console.log("Bundling A2UI...");
    try {
        execSync(`pnpm -s exec tsc -p "${path.join(A2UI_RENDERER_DIR, "tsconfig.json")}"`, { stdio: "inherit", cwd: ROOT_DIR });
        execSync(`npx rolldown -c "${path.join(A2UI_APP_DIR, "rolldown.config.mjs")}"`, { stdio: "inherit", cwd: ROOT_DIR });
        await fs.writeFile(HASH_FILE, currentHash, "utf-8");
        console.log("A2UI bundle generated successfully.");
    } catch (err) {
        console.error("A2UI bundling failed.");
        console.error("If this persists, verify pnpm deps and try again.");
        process.exit(1);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
