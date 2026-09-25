import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  outDir: "dist",
  dts: true,
  sourcemap: true,
  clean: !options.watch,
  target: "es2022",
  external: [
    "next",
    "next/server",
    /^@nishchinte\/.*/,
  ],
}));
