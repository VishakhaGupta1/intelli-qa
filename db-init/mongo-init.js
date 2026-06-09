const appDbName = process.env.MONGO_DB_NAME || 'qa_platform';
const appUser = process.env.MONGO_USERNAME || 'qa_platform_app';
const appPassword = process.env.MONGO_PASSWORD || 'change-me';
const authSource = process.env.MONGO_AUTH_SOURCE || appDbName;

const appDb = db.getSiblingDB(appDbName);

function ensureIndex(collectionName, spec, options) {
  const collection = appDb.getCollection(collectionName);
  collection.createIndex(spec, options || {});
}

ensureIndex('test_results', { testName: 1, runAt: -1 }, { name: 'idx_test_results_testName_runAt' });
ensureIndex('test_results', { status: 1, runAt: -1 }, { name: 'idx_test_results_status_runAt' });
ensureIndex('defect_logs', { severity: 1, detectedAt: -1 }, { name: 'idx_defect_logs_severity_detectedAt' });
ensureIndex('defect_logs', { endpoint: 1 }, { name: 'idx_defect_logs_endpoint' });
ensureIndex('gap_reports', { endpoint: 1, generatedAt: -1 }, { name: 'idx_gap_reports_endpoint_generatedAt' });
ensureIndex('spec_endpoints', { path: 1, method: 1 }, { name: 'idx_spec_endpoints_path_method', unique: true });
ensureIndex('trust_scores', { timestamp: -1 }, { name: 'idx_trust_scores_timestamp' });

if (!appDb.getUser(appUser)) {
  appDb.createUser({
    user: appUser,
    pwd: appPassword,
    roles: [{ role: 'readWrite', db: appDbName }]
  });
}

print(`Mongo init complete for ${appDbName} using auth source ${authSource}`);
