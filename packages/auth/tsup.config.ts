import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: [
    "src/index.ts",
    "src/server.ts",
    "src/react.tsx",
    "src/middleware.ts",
  ],
  format: ["esm", "cjs"],
  outDir: "dist",
  dts: true,
  bundle: true,
  sourcemap: true,
  clean: !options.watch,
  target: "es2022",
  skipNodeModulesBundle: true,
  external: [
    "react",
    "react-dom",
    "next",
    "next/headers",
    "next/navigation",
    "next/server",
    /^@nishchinte\/.*/,
    "bcryptjs",
    "jose",
    "zod",
  ],
  outExtension({ format }) {
    return {
      js: format === "cjs" ? ".cjs" : ".mjs",
    };
  },
}));
