import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: [
    "src/index.ts",
    "src/client/index.ts",
    "src/server/index.ts",
    "src/react/index.ts",
  ],
  format: ["esm", "cjs"],
  outDir: "dist",
  dts: true,
  bundle: true,
  splitting: false,
  sourcemap: true,
  clean: !options.watch,
  shims: true,
  target: "es2022",
  skipNodeModulesBundle: true,
  external: ["react", "react-dom", "@prisma/client", "@nishchinte/config"],
  outExtension({ format }) {
    return {
      js: format === "cjs" ? ".cjs" : ".mjs",
    };
  },
}));
