import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";
import { loadConfig } from "@nishchinte/config";
import { logger } from "../../utils/logger";
import pc from "picocolors";

export function findSchemaPath(): { schemaPath: string; configPath: string } {
  const require = createRequire(import.meta.url);
  const result = { schemaPath: "", configPath: "" };

  // Try to resolve via node_modules / package dependency
  try {
    const dbPkgPath = require.resolve("@nishchinte/db/package.json");
    const schemaPath = path.resolve(
      path.dirname(dbPkgPath),
      "prisma/schema.prisma",
    );
    const configPath = path.resolve(
      path.dirname(dbPkgPath),
      "prisma.config.ts",
    );

    if (fs.existsSync(schemaPath)) result.schemaPath = schemaPath;
    if (fs.existsSync(configPath)) result.configPath = configPath;

    // If schema is found via node_modules, we can safely return what we found
    if (result.schemaPath) return result;
  } catch {
    // Fallback searching in workspace
  }

  // Workspace / Monorepo Fallback
  const cwd = process.cwd();
  const searchDirectories = [
    "packages/db/",
    "../../packages/db/",
    "../packages/db/",
    "node_modules/@nishchinte/db/",
  ];

  // Look for schemaPath
  for (const dir of searchDirectories) {
    const potentialSchema = path.resolve(cwd, dir, "prisma/schema.prisma");
    if (fs.existsSync(potentialSchema)) {
      result.schemaPath = potentialSchema;
      // Assume config is in the same directory structure relative to the schema
      const potentialConfig = path.resolve(cwd, dir, "prisma.config.ts");
      if (fs.existsSync(potentialConfig)) {
        result.configPath = potentialConfig;
      }
      break;
    }
  }

  // Throw an error only if the essential schema file cannot be found
  if (!result.schemaPath) {
    throw new Error(
      "Could not locate '@nishchinte/db/prisma/schema.prisma'. Please ensure @nishchinte/db is installed.",
    );
  }

  return result;
}

export function findPrismaCliPath(): string {
  const require = createRequire(import.meta.url);

  // Resolve prisma package.json and dynamically locate the bin entry
  try {
    const prismaPkgPath = require.resolve("prisma/package.json");
    const prismaPkg = JSON.parse(fs.readFileSync(prismaPkgPath, "utf-8"));
    const binRel =
      typeof prismaPkg.bin === "string"
        ? prismaPkg.bin
        : prismaPkg.bin?.prisma || "dist/prisma.js";
    const cliPath = path.resolve(path.dirname(prismaPkgPath), binRel);
    if (fs.existsSync(cliPath)) {
      return cliPath;
    }
  } catch {
    // Continue fallback
  }

  // Monorepo node_modules fallback search
  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, "node_modules/prisma/dist/prisma.js"),
    path.resolve(cwd, "node_modules/prisma/build/index.js"),
    path.resolve(cwd, "../../node_modules/prisma/dist/prisma.js"),
    path.resolve(cwd, "../../node_modules/prisma/build/index.js"),
    path.resolve(cwd, "../node_modules/prisma/dist/prisma.js"),
    path.resolve(cwd, "../node_modules/prisma/build/index.js"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Could not locate 'prisma' CLI binary. Please ensure 'prisma' is installed in @nishchinte/cli.",
  );
}

export async function runDbCommand(
  action: string,
  subcommand: string,
  extraArgs: string[] = [],
): Promise<void> {
  const cwd = process.cwd();
  const { schemaPath, configPath } = findSchemaPath();
  const prismaCli = findPrismaCliPath();

  // Load active project configuration strictly from nishchinte.config.ts
  const config = await loadConfig({ cwd });
  const dbUrl =
    typeof config.database === "string"
      ? config.database
      : config.database?.url;

  if (!dbUrl) {
    logger.error("No database configuration found in nishchinte.config.ts");
    console.log(
      pc.yellow(
        "👉 Please define 'database: { url: \"...\" }' in your nishchinte.config.ts\n",
      ),
    );
    process.exit(1);
  }

  logger.info(
    `Loaded database configuration from ${pc.bold("nishchinte.config.ts")}`,
  );

  const env = {
    ...process.env,
    DATABASE_URL: dbUrl,
  };

  let prismaArgs = [
    action,
    subcommand,
    `--schema=${schemaPath}`,
    `--config=${configPath}`,
    ...extraArgs,
  ];

  logger.step("Running Prisma command", `prisma ${prismaArgs.join(" ")}`);

  const child = spawn(process.execPath, [prismaCli, ...prismaArgs], {
    cwd,
    env,
    stdio: "inherit",
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}
