#!/usr/bin/env tsx
/**
 * Validates the one-way import direction rule for shared/schema/schema-*.ts.
 *
 * Rule: a file `schema-NN[-suffix].ts` may only import from files
 * `schema-MM[-suffix].ts` where MM < NN.
 *
 * See shared/schema/README.md for the full rule and rationale.
 *
 * Exits with code 1 if any violation is found.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SCHEMA_DIR = join(process.cwd(), "shared", "schema");
const FILE_RE = /^schema-(\d+)(?:-[a-z0-9-]+)?\.ts$/i;
const IMPORT_RE = /from\s+['"]\.\/(schema-(\d+)(?:-[a-z0-9-]+)?)['"]/g;

type Violation = {
  file: string;
  fileNum: number;
  importedFile: string;
  importedNum: number;
  line: number;
};

function main(): void {
  const entries = readdirSync(SCHEMA_DIR);
  const violations: Violation[] = [];

  for (const entry of entries) {
    const match = entry.match(FILE_RE);
    if (!match) continue;
    const fileNum = Number(match[1]);
    const fullPath = join(SCHEMA_DIR, entry);
    const lines = readFileSync(fullPath, "utf8").split("\n");

    lines.forEach((line, idx) => {
      // Skip comments
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;

      let m: RegExpExecArray | null;
      const re = new RegExp(IMPORT_RE.source, "g");
      while ((m = re.exec(line)) !== null) {
        const importedFile = m[1];
        const importedNum = Number(m[2]);
        if (importedNum >= fileNum) {
          violations.push({
            file: entry,
            fileNum,
            importedFile,
            importedNum,
            line: idx + 1,
          });
        }
      }
    });
  }

  if (violations.length === 0) {
    // eslint-disable-next-line no-console
    console.log(
      `[schema-import-direction] OK — no reverse imports found across ${entries.filter((e) => FILE_RE.test(e)).length} schema files.`,
    );
    return;
  }

  // eslint-disable-next-line no-console
  console.error(
    `[schema-import-direction] FAIL — ${violations.length} reverse import(s) detected.\n` +
      `A schema-NN file may only import from lower-numbered schema files.\n` +
      `See shared/schema/README.md for details.\n`,
  );
  for (const v of violations) {
    // eslint-disable-next-line no-console
    console.error(
      `  - ${v.file}:${v.line}  imports from ${v.importedFile}  (NN=${v.fileNum} ← MM=${v.importedNum})`,
    );
  }
  process.exit(1);
}

main();
