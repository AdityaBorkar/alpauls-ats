import { z } from "zod";

import { protectedProcedure } from "@/rpc/middleware";
import { listAuditLogs } from "@/services/audit-log-service";

const listAuditLogsSchema = z.object({
  changedBy: z.string().optional(),
  cursor: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  entityType: z.enum(["task", "client", "contract", "prospect"]).optional(),
  field: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
});

export const auditLogList = protectedProcedure
  .meta({ permission: { action: "read", resource: "audit_logs" } })
  .input(listAuditLogsSchema)
  .handler(async ({ input }) => {
    return listAuditLogs(input);
  });
