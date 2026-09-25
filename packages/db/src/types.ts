import { DefaultArgs } from "@prisma/client/runtime/client";
import { Prisma, PrismaClient } from "../generated/client/client";

export type PrismaTransaction = Omit<
  PrismaClient<never, Prisma.GlobalOmitConfig | undefined, DefaultArgs>,
  "$connect" | "$disconnect" | "$on" | "$use" | "$extends"
>;
