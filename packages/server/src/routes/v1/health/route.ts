import { CiferContext, CiferRequest, CiferResponse } from "ciferjs";

/**
 * GET /v1/health
 *
 * System diagnostic health check verifying database and service connectivity.
 */
export async function GET(req: CiferRequest, ctx: CiferContext) {
  const startTime = Date.now();
  // Database Health Check
  let dbStatus: {
    status: "healthy" | "unhealthy";
    latencyMs?: number;
    error?: string;
  } = {
    status: "unhealthy",
  };

  try {
    const dbStart = Date.now();
    await ctx.prisma.$queryRaw`SELECT 1`;
    dbStatus = {
      status: "healthy",
      latencyMs: Date.now() - dbStart,
    };
  } catch (error: any) {
    dbStatus = {
      status: "unhealthy",
      error: error?.message || "Failed to query database",
    };
  }

  const isDbHealthy = dbStatus.status === "healthy";
  const overallStatus = isDbHealthy ? "ok" : "error";
  const statusCode = isDbHealthy ? 200 : 503;

  return CiferResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      latencyMs: Date.now() - startTime,
      services: {
        database: dbStatus,
      },
    },
    { status: statusCode },
  );
}