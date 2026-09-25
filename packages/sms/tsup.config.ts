import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  outDir: "dist",
  dts: true,
  bundle: true,
  sourcemap: true,
  clean: !options.watch,
  target: "es2022",
  skipNodeModulesBundle: true,
  external: [/^@nishchinte\/.*/],
  outExtension({ format }) {
    return {
      js: format === "cjs" ? ".cjs" : ".mjs",
    };
  },
}));
