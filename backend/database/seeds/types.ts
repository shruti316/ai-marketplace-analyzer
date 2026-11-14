// =============================================================================
// Phase 3 Step 2B.3: Historical Dataset Seeding Types
// =============================================================================

export interface EntityImportSummary {
  entity: string;
  expectedRows: number;
  processedRows: number;
  insertedRows: number;
  updatedRows: number;
  skippedRows: number;
  failedRows: number;
  batchCount: number;
  executionTimeMs: number;
}

export interface ImportError {
  entity: string;
  identifier: string;
  rowIndex: number;
  error: string;
  rawRecord?: Record<string, unknown>;
}

export interface SeedReport {
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  isDryRun: boolean;
  startTime: string;
  endTime: string;
  totalDurationMs: number;
  totalRowsProcessed: number;
  totalRowsInserted: number;
  totalRowsUpdated: number;
  totalRowsFailed: number;
  summaries: Record<string, EntityImportSummary>;
  errors: ImportError[];
}

export interface SeedOptions {
  dryRun?: boolean;
  batchSize?: number;
  dataDir?: string;
  stopOnError?: boolean;
}

export interface NormalizedTimestamp {
  utcDateTime: string; // 'YYYY-MM-DD HH:mm:ss.SSS'
  rawSourceTimestamp: string;
  provenanceMarker: string;
  hasTimezoneOffset: boolean;
}
