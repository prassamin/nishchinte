import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: !options.watch,
  sourcemap: true,
  shims: true,
  target: "es2022",
  noExternal: [/^(\.\.\/)+generated/],
  external: ["@prisma/client", "@prisma/adapter-mariadb"],
}));
