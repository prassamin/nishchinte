import { defineConfig, Options } from "tsup";

export default defineConfig((options: Options) => [
  // 1. Unbundled compilation preserving RSC boundaries & file structure
  {
    entry: ["src/**/*.ts", "src/**/*.tsx", "!src/**/*.dts"],
    format: ["esm", "cjs"],
    outDir: "dist",
    dts: false,
    sourcemap: true,
    clean: false,
    target: "es2022",
    bundle: false,
  },
  // 2. CSS stylesheet bundling
  {
    entry: ["src/index.css"],
    outDir: "dist",
    clean: false,
    esbuildOptions(esOptions) {
      esOptions.conditions = ["style", "import", "module"];
    },
  },
]);
