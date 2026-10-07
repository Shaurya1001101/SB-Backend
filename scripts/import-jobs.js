/**
 * import-jobs.js
 * ──────────────
 * Entry point for `npm run import-jobs`.
 * Imports all datasets (Analytics Jobs, Data Science Jobs, JDS, SDS) into Supabase PostgreSQL.
 */

import { importAllDatasets } from './import-all-datasets.js';

importAllDatasets().catch(err => {
  console.error('❌ Import failed:', err);
  process.exit(1);
});
