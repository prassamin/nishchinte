import { Command } from "commander";
import pc from "picocolors";
import { createPrismaCommand } from "./commands/db/index";

export function createCli(): Command {
  const program = new Command("nishchinte");

  program
    .version("0.1.0", "-v, --version", "Output the current version")
    .description(
      pc.bold(pc.cyan("Nishchinte E-Commerce Platform CLI")) +
        "\n" +
        pc.dim("Unified developer tooling for database, config, and modules."),
    )
    .addHelpText(
      "beforeAll",
      `
${pc.bold(pc.magenta("  _   _ _     _          _     _       _       "))}
${pc.bold(pc.magenta(" | \\ | (_)___| |__   ___| |__ (_)_ __ | |_ ___ "))}
${pc.bold(pc.magenta(" |  \\| | / __| '_ \\ / __| '_ \\| | '_ \\| __/ _ \\"))}
${pc.bold(pc.magenta(" | |\\  | \\__ \\ | | | (__| | | | | | | | ||  __/"))}
${pc.bold(pc.magenta(" |_| \\_|_|___/_| |_|\\___|_| |_|_|_| |_|\\__\\___|"))}
`,
    );

  // Register Command Groups
  program.addCommand(createPrismaCommand());

  return program;
}

export async function run() {
  const program = createCli();
  await program.parseAsync(process.argv);
}

// Auto-run if executed directly
if (
  process.argv[1] &&
  (process.argv[1].endsWith("index.ts") ||
    process.argv[1].endsWith("index.js") ||
    process.argv[1].endsWith("nishchinte"))
) {
  run().catch((error) => {
    console.error(`\n${pc.red("✖ Fatal error:")}`, error?.message || error);
    process.exit(1);
  });
}
