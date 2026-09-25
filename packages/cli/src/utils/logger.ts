import pc from "picocolors";

export const logger = {
  info(message: string) {
    console.log(`${pc.cyan("ℹ")} ${message}`);
  },
  success(message: string) {
    console.log(`${pc.green("✔")} ${pc.bold(message)}`);
  },
  warn(message: string) {
    console.log(`${pc.yellow("⚠")} ${pc.yellow(message)}`);
  },
  error(message: string) {
    console.error(`${pc.red("✖")} ${pc.red(message)}`);
  },
  step(title: string, detail?: string) {
    console.log(
      `${pc.blue("◆")} ${pc.bold(title)}${detail ? ` ${pc.dim(detail)}` : ""}`,
    );
  },
  divider() {
    console.log(pc.dim("─".repeat(50)));
  },
};
