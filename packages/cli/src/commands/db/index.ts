import { Command } from "commander";
import { runDbCommand } from "./runner";

export function createPrismaCommand(): Command {
  const prisma = new Command("prisma")
    .description("Database management commands (Prisma powered)")
    .action(() => {
      prisma.help();
    });

  prisma.addCommand(createMigrateCommands());

  prisma
    .command("generate")
    .description("Generate artifacts (e.g. Prisma Client)")
    .allowUnknownOption(true)
    .action(async (options, command) => {
      const rawArgs = command.args || [];
      await runDbCommand("generate", "", rawArgs);
    });

  prisma
    .command("studio")
    .description("Browse your data")
    .allowUnknownOption(true)
    .action(async (options, command) => {
      const rawArgs = command.args || [];
      await runDbCommand("studio", "", rawArgs);
    });

  prisma.addCommand(createDbCommands());

  return prisma;
}

function createDbCommands() {
  const db = new Command("db")
    .description(
      "Manage your database schema and lifecycle during development.",
    )
    .action(() => {
      db.help();
    });

  db.command("pull")
    .description(
      "Pull the state from the database to the Prisma schema using introspection",
    )
    .option("--force", "Ignore current Prisma schema file")
    .allowUnknownOption(true)
    .action(async (options, command) => {
      const rawArgs = command.args || [];
      if (options.applied !== undefined && !rawArgs.includes("--force")) {
        rawArgs.unshift("--force");
      }
      await runDbCommand("db", "pull", rawArgs);
    });

  db.command("push")
    .description("Push the Prisma schema state directly to the database")
    .option("--accept-data-loss", "Ignore data loss warnings")
    .option("--force-reset", "Force a reset of the database before pushing")
    .allowUnknownOption(true)
    .action(async (options, command) => {
      const rawArgs = command.args || [];
      if (options.applied !== undefined && !rawArgs.includes("--force-reset")) {
        rawArgs.unshift("--force-reset");
      }
      if (
        options.applied !== undefined &&
        !rawArgs.includes("--accept-data-loss")
      ) {
        rawArgs.unshift("--accept-data-loss");
      }
      await runDbCommand("db", "push", rawArgs);
    });

  db.command("seed")
    .description("Seed your database")
    .allowUnknownOption(true)
    .action(async (options, command) => {
      const rawArgs = command.args || [];
      await runDbCommand("db", "seed", rawArgs);
    });

  return db;
}

function createMigrateCommands() {
  const migrate = new Command("migrate")
    .command("migrate")
    .description("Update the database schema with migrations")
    .action(() => {
      migrate.help();
    });

  migrate
    .command("dev")
    .description(
      "Create a migration from changes in Prisma schema, apply it to the database",
    )
    .option("--create-only", "Create a migration without applying it")
    .option("-n, --name <name>", "Name of the migration")
    .allowUnknownOption(true)
    .action(async (options, command) => {
      const rawArgs = command?.args || [];
      if (
        options.name &&
        !rawArgs.includes("--name") &&
        !rawArgs.includes("-n")
      ) {
        rawArgs.unshift(["--name", options.name].join("="));
      }
      await runDbCommand("migrate", "dev", rawArgs);
    });

  migrate
    .command("reset")
    .description(
      "Reset your database and apply all migrations, all data will be lost",
    )
    .option("-f, --force", "Skip the confirmation prompt")
    .allowUnknownOption(true)
    .action(async (options, command) => {
      const rawArgs = command.args || [];
      if (
        options.applied !== undefined &&
        !rawArgs.includes("--force") &&
        !rawArgs.includes("-f")
      ) {
        rawArgs.unshift("--force");
      }
      await runDbCommand("migrate", "reset", rawArgs);
    });

  migrate
    .command("deploy")
    .description("Apply pending migrations to the database")
    .allowUnknownOption(true)
    .action(async (_options, command) => {
      const rawArgs = command.args || [];
      await runDbCommand("migrate", "deploy", rawArgs);
    });

  migrate
    .command("status")
    .description("Check the status of your database migrations")
    .allowUnknownOption(true)
    .action(async (_options, command) => {
      const rawArgs = command.args || [];
      await runDbCommand("migrate", "status", rawArgs);
    });

  migrate
    .command("resolve")
    .description(
      "Resolve issues with database migrations, i.e. baseline, failed migration, hotfix",
    )
    .option("--applied", "Record a specific migration as applied")
    .option("--rolled-back", "Record a specific migration as rolled back")
    .allowUnknownOption(true)
    .action(async (options, command) => {
      const rawArgs = command.args || [];

      if (options.applied !== undefined && !rawArgs.includes("--applied")) {
        rawArgs.unshift("--applied");
      }

      if (
        options.rolledBack !== undefined &&
        !rawArgs.includes("--rolled-back")
      ) {
        rawArgs.unshift("--rolled-back");
      }

      await runDbCommand("migrate", "resolve", rawArgs);
    });

  return migrate;
}
