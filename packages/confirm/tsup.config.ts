import { defineConfig } from "tsup";

export default defineConfig((options) => [
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: !options.watch,
    target: "es2022",
    banner: {
      js: '"use client";',
    },
    external: [
      "react",
      "react-dom",
      /^@heroui\/.*/,
      "lucide-react",
      /^@nishchinte\/.*/,
    ],
  },
  {
    entry: ["src/index.css"],
    outDir: "dist",
    clean: false,
    esbuildOptions(esOptions) {
      esOptions.conditions = ["style", "import", "module"];
    },
  },
]);
