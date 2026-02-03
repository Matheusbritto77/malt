import { loadConfig } from "../src/config/config.js";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../src/agents/agent-scope.js";
import { buildWorkspaceSkillStatus } from "../src/agents/skills-status.js";
import { installSkill } from "../src/agents/skills-install.js";

async function main() {
    console.log("[skills-install] Loading configuration...");
    const config = loadConfig();
    const agentId = resolveDefaultAgentId(config);
    const workspaceDir = resolveAgentWorkspaceDir(config, agentId);

    console.log(`[skills-install] Workspace: ${workspaceDir}`);
    const report = buildWorkspaceSkillStatus(workspaceDir, { config });

    const toInstall = report.skills.filter(s => s.install.length > 0 && !s.eligible);

    if (toInstall.length === 0) {
        console.log("[skills-install] All skills are already ready or have no install options.");
        return;
    }

    console.log(`[skills-install] Found ${toInstall.length} skills with missing dependencies. Starting installation...`);

    for (const skill of toInstall) {
        console.log(`[skills-install] Installing dependencies for ${skill.name} (${skill.install[0].label})...`);
        try {
            const result = await installSkill({
                workspaceDir,
                skillName: skill.name,
                installId: skill.install[0].id,
                config,
            });

            if (result.ok) {
                console.log(`[skills-install] ✓ ${skill.name}: ${result.message}`);
            } else {
                console.warn(`[skills-install] ✗ ${skill.name} failed: ${result.message}`);
            }
        } catch (err) {
            console.error(`[skills-install] ✗ Error installing ${skill.name}:`, err);
        }
    }

    console.log("[skills-install] Pre-installation process finished.");
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
