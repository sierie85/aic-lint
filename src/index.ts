import { resolve } from "path"
import { runAudit, toMarkdown } from "./audit.js"

const args = process.argv.slice(2)
const noBudget = args.includes("--no-budget")
const asJson = args.includes("--json")
const projectRoot = resolve(args.find((a) => !a.startsWith("--")) ?? ".")

const result = runAudit(projectRoot, { noBudget })

if (asJson) {
  process.stdout.write(JSON.stringify(result, null, 2) + "\n")
} else {
  process.stdout.write(toMarkdown(result) + "\n")
}

process.exit(result.hasErrors ? 1 : 0)
