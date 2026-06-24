#!/usr/bin/env node
import { resolve } from "path"
import { runAudit, toMarkdown } from "./audit.js"
import { applyFixes } from "./fix.js"
import { runInit, type InitTarget } from "./init.js"

const args = process.argv.slice(2)

if (args[0] === "init") {
  const targets: InitTarget[] = []
  if (args.includes("--all")) targets.push("claude", "codex")
  if (args.includes("--claude")) targets.push("claude")
  if (args.includes("--codex")) targets.push("codex")
  const { written } = runInit({
    targets: targets.length > 0 ? targets : undefined,
    project: args.includes("--project"),
  })
  for (const w of written) {
    process.stdout.write(`Installed /audit (${w.target}) → ${w.path}\n`)
  }
  process.exit(0)
}

const noBudget = args.includes("--no-budget")
const asJson = args.includes("--json")
const projectRoot = resolve(args.find((a) => !a.startsWith("--")) ?? ".")

const dryRun = args.includes("--fix-dry-run")
if (args.includes("--fix") || dryRun) {
  const { findings } = runAudit(projectRoot, { noBudget: true })
  const applied = applyFixes(projectRoot, findings, { dryRun })
  if (applied.length === 0) {
    process.stdout.write("No auto-fixable issues found.\n")
  } else {
    const verb = dryRun ? "Would fix" : "Fixed"
    for (const a of applied) process.stdout.write(`${verb}: ${a.description}\n`)
  }
  process.exit(0)
}

const result = runAudit(projectRoot, { noBudget })

if (asJson) {
  process.stdout.write(JSON.stringify(result, null, 2) + "\n")
} else {
  process.stdout.write(toMarkdown(result) + "\n")
}

process.exit(result.hasErrors ? 1 : 0)
