import { existsSync, readFileSync } from "fs";
import { join } from "path";
export const CONFIG_FILENAME = ".aiclintrc.json";
export const DEFAULT_THRESHOLDS = {
    claudeMdWarnLines: 80,
    claudeMdErrorLines: 150,
    alwaysOnWarnTokens: 8000,
    alwaysOnErrorTokens: 16000,
};
export const DEFAULT_SETTINGS = { rules: {}, thresholds: DEFAULT_THRESHOLDS };
const VALID_RULES = new Set(["off", "info", "warn", "error"]);
// Reads .aiclintrc.json from the project root and merges it over the defaults.
// A missing file yields defaults; an invalid file is reported to stderr and
// ignored (the audit still runs with defaults).
export function loadSettings(root) {
    const path = join(root, CONFIG_FILENAME);
    if (!existsSync(path))
        return DEFAULT_SETTINGS;
    let parsed;
    try {
        parsed = JSON.parse(readFileSync(path, "utf8"));
    }
    catch (e) {
        process.stderr.write(`aic-lint: ignoring invalid ${CONFIG_FILENAME} (${e.message})\n`);
        return DEFAULT_SETTINGS;
    }
    const rules = {};
    for (const [id, level] of Object.entries(parsed.rules ?? {})) {
        if (typeof level === "string" && VALID_RULES.has(level))
            rules[id] = level;
    }
    const thresholds = { ...DEFAULT_THRESHOLDS };
    for (const key of Object.keys(DEFAULT_THRESHOLDS)) {
        const value = parsed.thresholds?.[key];
        if (typeof value === "number")
            thresholds[key] = value;
    }
    return { rules, thresholds };
}
