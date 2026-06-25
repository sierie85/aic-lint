export const FILE_EXTENSIONS = new Set([
    "md", "py", "js", "ts", "tsx", "jsx", "json", "toml", "yaml", "yml",
    "sh", "bash", "txt", "cfg", "ini", "env", "html", "css", "rs", "go",
    "rb", "java", "kt", "cs", "cpp", "c", "h", "lock", "sql",
]);
// http://, mailto:, tel:, file:, … and anchors (#...) are not file references.
function isExternalRef(ref) {
    return /^[a-z][a-z0-9+.-]*:/i.test(ref) || ref.startsWith("#");
}
export function extractFileRefs(text) {
    const refs = [];
    // Inline code: only path-like tokens (containing "/") count as a reference —
    // a bare filename like `settings.json` is usually just a mention.
    for (const m of text.matchAll(/`([^`\s]+)`/g)) {
        const c = m[1];
        if (isExternalRef(c) || /[*?]/.test(c) || !c.includes("/"))
            continue;
        const ext = c.includes(".") ? c.split(".").pop().toLowerCase() : "";
        if (FILE_EXTENSIONS.has(ext))
            refs.push(c);
    }
    for (const m of text.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
        const c = m[2];
        if (!isExternalRef(c) && !/[*?]/.test(c))
            refs.push(c);
    }
    return refs;
}
export function extractH2Headings(text) {
    const headings = new Set();
    for (const m of text.matchAll(/^## (.+)$/gm))
        headings.add(m[1].trim());
    return headings;
}
export function stripCodeFences(text) {
    return text.replace(/```[\s\S]*?```/g, "");
}
