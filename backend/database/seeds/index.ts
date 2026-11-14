import { Pool } from 'mysql2/promise';
import { DatasetSeeder } from './seeder';
import { SeedReport, SeedOptions } from './types';
import { getApplicationPool } from '../../src/config/database';

// =============================================================================
// HISTORICAL DATASET SEED RUNNER (CLI & PROGRAMMATIC ENTRY)
// =============================================================================

/**
 * Runs the historical dataset seeding pipeline.
 */
export async function runSeed(pool?: Pool, options: SeedOptions = {}): Promise<SeedReport> {
  const seeder = new DatasetSeeder(options);
  return seeder.run(pool || null);
}

/**
 * Formats and prints a structured, readable Seed Report.
 */
export function printSeedReport(report: SeedReport): void {
  console.log('=============================================================================');
  console.log(`HISTORICAL DATASET SEED REPORT [${report.status}] ${report.isDryRun ? '(DRY RUN / SIMULATION)' : '(LIVE DATABASE)'}`);
  console.log('=============================================================================');
  console.log(`Started:  ${report.startTime}`);
  console.log(`Finished: ${report.endTime}`);
  console.log(`Duration: ${report.totalDurationMs} ms`);
  console.log(`Total Records Processed: ${report.totalRowsProcessed.toLocaleString()}`);
  console.log(`Total Records Inserted:  ${report.totalRowsInserted.toLocaleString()}`);
  console.log(`Total Records Updated:   ${report.totalRowsUpdated.toLocaleString()}`);
  console.log(`Total Records Failed:    ${report.totalRowsFailed}`);
  console.log('-----------------------------------------------------------------------------');
  console.log(
    'Entity'.padEnd(28) +
    'Expected'.padEnd(12) +
    'Processed'.padEnd(12) +
    'Inserted'.padEnd(12) +
    'Updated'.padEnd(10) +
    'Batches'.padEnd(10) +
    'Time (ms)'
  );
  console.log('-'.repeat(93));

  for (const [entity, s] of Object.entries(report.summaries)) {
    console.log(
      entity.padEnd(28) +
      String(s.expectedRows).padEnd(12) +
      String(s.processedRows).padEnd(12) +
      String(s.insertedRows).padEnd(12) +
      String(s.updatedRows).padEnd(10) +
      String(s.batchCount).padEnd(10) +
      String(s.executionTimeMs)
    );
  }

  console.log('=============================================================================');

  if (report.errors.length > 0) {
    console.error(`\n[ERRORS DETECTED: ${report.errors.length}]`);
    for (const err of report.errors) {
      console.error(`  - [${err.entity}] ID: ${err.identifier} (Row ${err.rowIndex}): ${err.error}`);
    }
    console.log('=============================================================================');
  }
}

// =============================================================================
// CLI DISPATCHER
// =============================================================================
if (require.main === module) {
  const args = process.argv.slice(2);
  const isLive = args.includes('--live');
  const dryRun = !isLive || args.includes('--dry-run');

  let batchSize = 250;
  const batchIdx = args.indexOf('--batch-size');
  if (batchIdx !== -1 && args[batchIdx + 1]) {
    batchSize = parseInt(args[batchIdx + 1], 10) || 250;
  }

  (async () => {
    try {
      let pool: Pool | undefined = undefined;
      if (!dryRun) {
        pool = getApplicationPool();
      }

      console.log(`[INFO] Starting seed execution (Mode: ${dryRun ? 'DRY-RUN' : 'LIVE'}, Batch Size: ${batchSize})...`);
      const report = await runSeed(pool, { dryRun, batchSize });
      printSeedReport(report);

      if (report.status === 'FAILED') {
        process.exit(1);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n[FATAL SEED ERROR] ${message}`);
      process.exit(1);
    }
  })();
}
