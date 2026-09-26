import { PrismaClient } from "@prisma/client";

// Single shared instance — avoids exhausting the Postgres connection pool
// under tsx's hot-reload in dev.
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
