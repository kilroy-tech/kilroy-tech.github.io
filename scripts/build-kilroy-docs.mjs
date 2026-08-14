import { mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultOutputDir = "/Users/cshotton/Dropbox/projects/kilroy.backend/api/platform_data/demo/apps/kilroy.docs/public";
const outputDir = process.env.KILROY_DOCS_PUBLIC || defaultOutputDir;
const tempOutputDir = process.env.KILROY_DOCS_BUILD_DIR || resolve(tmpdir(), "kilroy-docs-site-inapp");

mkdirSync(tempOutputDir, { recursive: true });
mkdirSync(outputDir, { recursive: true });

execFileSync("mkdocs", ["build", "-f", "mkdocs.kilroy.docs.yml", "-d", tempOutputDir], {
  cwd: rootDir,
  stdio: "inherit",
});

execFileSync("rsync", ["-a", `${tempOutputDir}/`, `${outputDir}/`], {
  cwd: rootDir,
  stdio: "inherit",
});