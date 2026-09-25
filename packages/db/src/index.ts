import type { Prisma } from "../generated/client/client";

declare module "@nishchinte/config" {
  interface NishchinteModelRegistry extends Record<Prisma.ModelName, true> {}
}

declare module "@nishchinte/realtime" {
  interface NishchinteModelRegistry extends Record<Prisma.ModelName, true> {}
}

export * from "../generated/client/client";
export { prisma, db, getDb, createDbClient } from "./client";
export type PrismaModel = Prisma.ModelName;

export * from "./types";
