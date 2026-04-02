import { z } from "zod";

// ─── Events ──────────────────────────────────────────────────────────────────

const iso8601 = z.string().datetime({ offset: true });
export const CreateEventSchema = z
  .object({
    name: z.string().min(1).max(255),
    description: z.string().min(1),
    dateStart: iso8601,
    dateEnd: iso8601,
    subTag_id: z.number().int().positive(),
    microsoft_id: z.string().optional(), // populated server-side; ignored if provided by client
  })
  .refine(
    (data) =>
      new Date(data.dateEnd).getTime() > new Date(data.dateStart).getTime(),
    {
      message: "dateEnd must be after dateStart",
      path: ["dateEnd"],
    }
  );

export const UpdateEventSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().min(1).max(255).optional(),
    description: z.string().min(1).optional(),
    dateStart: iso8601.optional(),
    dateEnd: iso8601.optional(),
    subTag_id: z.number().int().positive().optional(),
  })
  .refine(
    (data) =>
      !data.dateStart ||
      !data.dateEnd ||
      new Date(data.dateEnd).getTime() > new Date(data.dateStart).getTime(),
    {
      message: "dateEnd must be after dateStart when both are provided",
      path: ["dateEnd"],
    }
  );

export const DeleteByIdSchema = z.object({
  id: z.number().int().positive(),
});

// ─── Rooms ───────────────────────────────────────────────────────────────────

export const CreateRoomSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  color: z
    .string()
    .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Must be a valid hex colour")
    .optional()
    .nullable(),
  tag_id: z.number().int().positive().optional().nullable(),
});

export const UpdateRoomSchema = CreateRoomSchema.partial().extend({
  id: z.number().int().positive(),
});

// ─── User (internal lookup — no mutable fields exposed to clients) ────────────

export const MicrosoftIdSchema = z.object({
  microsoft_id: z.string().min(1),
});
