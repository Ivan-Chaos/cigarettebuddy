import { schema, type Database } from '@cigbuddy/db';
import type { ReportReason } from '@cigbuddy/shared';

/** What the signaling layer knows about a report; the row adds id and time. */
export interface ReportRecord {
  roomId: string;
  reporterId: string;
  /** Null when the reporter was alone in the room. */
  reportedId: string | null;
  reason: ReportReason;
  note: string | null;
}

export interface ReportStore {
  save(report: ReportRecord): Promise<void>;
}

export function createDbReportStore(db: Database): ReportStore {
  return {
    async save(report) {
      await db.insert(schema.reports).values(report);
    },
  };
}
