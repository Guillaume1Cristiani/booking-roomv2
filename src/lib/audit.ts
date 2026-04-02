import { db } from "@/db";
import { AuditLogs } from "@/db/schema";

export type AuditAction = "create" | "update" | "delete";
export type AuditResource = "event" | "room";

export interface AuditContext {
  action: AuditAction;
  resource: AuditResource;
  resourceId?: number;
  userId?: string | null;
  societyId?: number | null;
  metadata?: unknown;
}

/**
 * Write an audit log entry. Failures are swallowed and logged to stderr so
 * a broken audit trail never fails the primary operation.
 */
export async function logAudit(ctx: AuditContext): Promise<void> {
  try {
    await db.insert(AuditLogs).values({
      action: ctx.action,
      resource: ctx.resource,
      resourceId: ctx.resourceId ?? null,
      userId: ctx.userId ?? null,
      societyId: ctx.societyId ?? null,
      metadata: ctx.metadata != null ? JSON.stringify(ctx.metadata) : null,
    });
  } catch (err) {
    console.error("[audit] Failed to write audit log:", err);
  }
}
