import { PrismaClient } from '@prisma/client';

// Shared Prisma client to avoid connection exhaustion and simplify lifecycle
export const prisma = new PrismaClient();

export default prisma;
