import 'server-only'
import { Prisma } from '@prisma/client'

/**
 * Serialize mutations for one logical aggregate for the duration of the current
 * transaction. PostgreSQL releases this advisory lock automatically on commit.
 */
export async function lockAggregate(tx: Prisma.TransactionClient, key: string): Promise<void> {
  await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${key}))`)
}