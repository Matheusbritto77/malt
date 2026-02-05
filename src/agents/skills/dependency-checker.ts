import fs from "node:fs";
import path from "node:path";
import { hasBinary } from "./config.js";

/**
 * Padrão Strategy para verificação de dependências.
 * Foca em performance e precisão.
 */
export class DependencyChecker {
    /**
     * Verifica se uma dependência está no package.json local.
     */
    public static hasNpmDependency(pkgName: string): boolean {
        const deps = this.loadPackageDependencies();
        return pkgName in deps;
    }

    /**
     * Verifica se uma linguagem ou binário de sistema está presente.
     * Ex: 'php', 'python3', 'go'.
     */
    public static hasLanguage(lang: string): boolean {
        // Mapeamento de nomes amigáveis para binários reais
        const map: Record<string, string> = {
            php: "php",
            python: "python3",
            golang: "go",
            go: "go",
            rust: "cargo",
            cpp: "g++",
            c: "gcc",
        };

        const bin = map[lang.toLowerCase()] ?? lang;
        return hasBinary(bin);
    }

    private static loadPackageDependencies(): Record<string, string> {
        try {
            const pkgPath = path.resolve(process.cwd(), "package.json");
            if (!fs.existsSync(pkgPath)) return {};
            const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
            return {
                ...(pkg.dependencies ?? {}),
                ...(pkg.devDependencies ?? {}),
                ...(pkg.optionalDependencies ?? {}),
            };
        } catch {
            return {};
        }
    }
}
