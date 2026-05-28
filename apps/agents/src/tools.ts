import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import type Anthropic from "@anthropic-ai/sdk";

export const ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../../../"
);

export const TOOLS: Anthropic.Tool[] = [
  {
    name: "read_file",
    description: "Read the full contents of a file in the project repository.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "File path relative to the project root (e.g. apps/api/src/routes/kyc.ts)",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "list_files",
    description: "List all files in a directory (excluding node_modules, .next, dist, out, lib).",
    input_schema: {
      type: "object" as const,
      properties: {
        dir: {
          type: "string",
          description: "Directory path relative to project root (e.g. contracts/src)",
        },
      },
      required: ["dir"],
    },
  },
  {
    name: "grep_code",
    description: "Search for a pattern across all TypeScript, Solidity, and TSX source files.",
    input_schema: {
      type: "object" as const,
      properties: {
        pattern: {
          type: "string",
          description: "grep-compatible regex pattern to search for",
        },
        dir: {
          type: "string",
          description: "Optional subdirectory to limit the search (relative to project root)",
        },
      },
      required: ["pattern"],
    },
  },
];

const IGNORED = ["node_modules", ".next", "dist", "out", "lib", "build", "cache", "broadcast"];

function isIgnored(p: string) {
  return IGNORED.some((seg) => p.includes(seg));
}

function listRecursive(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (isIgnored(full)) continue;
    if (entry.isDirectory()) {
      results.push(...listRecursive(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

export function executeTool(name: string, input: Record<string, string>): string {
  try {
    if (name === "read_file") {
      const full = path.join(ROOT, input.path);
      if (!fs.existsSync(full)) return `ERROR: File not found — ${input.path}`;
      const content = fs.readFileSync(full, "utf8");
      // Cap at 8 KB to keep tool results manageable
      return content.length > 8000 ? content.slice(0, 8000) + "\n... [truncated]" : content;
    }

    if (name === "list_files") {
      const full = path.join(ROOT, input.dir ?? ".");
      if (!fs.existsSync(full)) return `ERROR: Directory not found — ${input.dir}`;
      const files = listRecursive(full).map((f) => path.relative(ROOT, f));
      return files.join("\n") || "(empty)";
    }

    if (name === "grep_code") {
      const searchDir = input.dir ? path.join(ROOT, input.dir) : ROOT;
      try {
        const out = execSync(
          `grep -r --include="*.ts" --include="*.tsx" --include="*.sol" --include="*.json" -n "${input.pattern}" "${searchDir}" 2>/dev/null | grep -v node_modules | grep -v ".next" | grep -v "/out/" | grep -v "/lib/" | head -40`,
          { encoding: "utf8", timeout: 10000 }
        );
        return out.trim() || "No matches found.";
      } catch {
        return "No matches found.";
      }
    }

    return `ERROR: Unknown tool — ${name}`;
  } catch (e: any) {
    return `ERROR: ${e.message}`;
  }
}
