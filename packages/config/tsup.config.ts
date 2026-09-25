import { defineConfig } from "tsup";

export default defineConfig((options) => [
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: !options.watch,
    target: "es2022",
    external: ["react", "react-dom"],
  },
  {
    entry: ["src/client.tsx"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    target: "es2022",
    banner: {
      js: '"use client";',
    },
    external: ["react", "react-dom"],
  },
]);
