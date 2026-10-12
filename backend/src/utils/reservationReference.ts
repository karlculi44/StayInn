import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";

const referenceAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const referenceGenerationAttempts = 3;

export function generateReservationReferenceId(): string {
  const generateSegment = () =>
    Array.from(
      { length: 4 },
      () => referenceAlphabet.charAt(randomInt(referenceAlphabet.length)),
    ).join("");

  return `STY-${generateSegment()}-${generateSegment()}`;
}

function isReferenceIdCollision(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }

  const target = error.meta?.target;
  const targetDescription = Array.isArray(target)
    ? target.join(" ")
    : String(target ?? "");

  return targetDescription.includes("referenceId");
}

export async function createWithReservationReference<T>(
  create: (referenceId: string) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < referenceGenerationAttempts; attempt += 1) {
    try {
      return await create(generateReservationReferenceId());
    } catch (error) {
      if (
        !isReferenceIdCollision(error) ||
        attempt === referenceGenerationAttempts - 1
      ) {
        throw error;
      }
    }
  }

  throw new Error("Failed to generate a reservation reference ID.");
}
