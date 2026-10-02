import { prisma } from "../lib/prisma.js";

export const cleanupRefreshTokens = async () => {
  const result = await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  console.log(`Removed ${result.count} expired refresh tokens`);
};
