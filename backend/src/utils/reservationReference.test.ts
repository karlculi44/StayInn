import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  createWithReservationReference,
  generateReservationReferenceId,
} from "./reservationReference.js";

describe("reservation reference IDs", () => {
  it("uses the StayInn prefix and eight unambiguous characters", () => {
    const referenceId = generateReservationReferenceId();

    expect(referenceId).toMatch(/^STY-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  });

  it("retries when the reference ID collides", async () => {
    const create = vi
      .fn<(referenceId: string) => Promise<string>>()
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "test",
          meta: { target: ["referenceId"] },
        }),
      )
      .mockImplementation(async (referenceId) => referenceId);

    const result = await createWithReservationReference(create);
    const attemptedReferences = create.mock.calls.map(([referenceId]) => referenceId);

    expect(create).toHaveBeenCalledTimes(2);
    expect(new Set(attemptedReferences).size).toBe(2);
    expect(result).toBe(attemptedReferences.at(-1));
  });

  it("does not retry unrelated database errors", async () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      {
        code: "P2002",
        clientVersion: "test",
        meta: { target: ["roomId"] },
      },
    );
    const create = vi.fn().mockRejectedValue(error);

    await expect(createWithReservationReference(create)).rejects.toBe(error);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("stops after three reference collisions", async () => {
    const collision = () =>
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
        meta: { target: ["referenceId"] },
      });
    const create = vi.fn().mockRejectedValue(collision());

    await expect(createWithReservationReference(create)).rejects.toBeInstanceOf(
      Prisma.PrismaClientKnownRequestError,
    );
    expect(create).toHaveBeenCalledTimes(3);
  });
});
