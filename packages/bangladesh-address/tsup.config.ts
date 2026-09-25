import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  tsconfig: "./tsconfig.json",
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  outDir: "dist",
  dts: true,
  bundle: true,
  splitting: true,
  sourcemap: true,
  clean: !options.watch,
  target: "esnext",
  skipNodeModulesBundle: true,
  onSuccess: async () => {
    console.log("Build completed successfully!");
  },
  esbuildOptions(options) {
    options.banner = {
      js: `'use client';`,
    };
  },
  outExtension({ format }) {
    return {
      js: format === "cjs" ? ".cjs" : ".mjs",
    };
  },
}));
