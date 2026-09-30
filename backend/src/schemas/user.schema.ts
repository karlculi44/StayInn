import { z } from "zod";

export const updateUserRoleSchema = z.object({
  role: z.enum(["ADMIN", "GUEST"]),
});
