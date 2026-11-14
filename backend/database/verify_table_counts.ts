import { RowDataPacket } from 'mysql2/promise';
import { getApplicationPool, closeApplicationPool } from '../src/config/database';
import { getEnv } from '../src/config/env';

interface CountResult extends RowDataPacket {
  cnt: number;
}

export async function checkTableCounts(): Promise<Record<string, number>> {
  const pool = getApplicationPool();
  const tables = [
    'platforms',
    'brands',
    'sellers',
    'canonical_products',
    'marketplace_listings',
    'price_history',
    'trust_assessments',
    'users',
    'annotation_tasks',
    'ground_truth_annotations',
    'annotation_task_assignments',
    'annotation_adjudications',
    'product_comparisons',
    'product_comparison_items',
    'user_sessions',
    'schema_migrations'
  ];

  const counts: Record<string, number> = {};

  try {
    for (const table of tables) {
      const [rows] = await pool.query<CountResult[]>(`SELECT COUNT(*) AS cnt FROM \`${table}\``);
      counts[table] = rows[0]?.cnt ?? 0;
    }
  } finally {
    await closeApplicationPool();
  }

  return counts;
}

if (require.main === module) {
  checkTableCounts()
    .then(counts => {
      console.log('TABLE ROW COUNTS:');
      console.log('-------------------------------------------');
      for (const [table, cnt] of Object.entries(counts)) {
        console.log(`${table.padEnd(30)} : ${cnt}`);
      }
      console.log('-------------------------------------------');
      process.exit(0);
    })
    .catch(err => {
      console.error('[COUNT AUDIT ERROR]', err);
      process.exit(1);
    });
}
