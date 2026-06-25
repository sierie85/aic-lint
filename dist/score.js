// Penalty deducted from a dimension per finding, by severity.
const PENALTY = {
    ERROR: 25,
    WARN: 8,
    INFO: 2,
};
// Weight of each dimension in the overall score (must sum to 1). Key order
// also determines display order in the report.
const WEIGHT = {
    security: 0.3,
    structure: 0.2,
    efficiency: 0.2,
    maintainability: 0.15,
    validity: 0.15,
};
const CATEGORIES = Object.keys(WEIGHT);
function clamp(n) {
    return Math.max(0, Math.min(100, n));
}
function grade(score) {
    if (score >= 90)
        return "A";
    if (score >= 80)
        return "B";
    if (score >= 70)
        return "C";
    if (score >= 60)
        return "D";
    return "F";
}
// Computes a deterministic 0–100 score. Each dimension starts at 100 and loses
// points per finding (by severity); the overall score is the weighted average.
// A dimension with no findings scores a perfect 100.
export function computeScore(findings) {
    const dimensions = Object.fromEntries(CATEGORIES.map((c) => [c, 100]));
    for (const f of findings) {
        const category = f.category ?? "maintainability";
        dimensions[category] = clamp(dimensions[category] - PENALTY[f.level]);
    }
    const overall = Math.round(CATEGORIES.reduce((sum, c) => sum + dimensions[c] * WEIGHT[c], 0));
    return { overall, grade: grade(overall), dimensions };
}
