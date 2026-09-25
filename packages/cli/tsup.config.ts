import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: !options.watch,
  sourcemap: true,
  target: "es2022",
  banner: {
    js: "#!/usr/bin/env node",
  },
}));
