const { MongoClient } = require('mongodb');

function buildMongoUri() {
  if (process.env.MONGO_URI) {
    return process.env.MONGO_URI;
  }

  const host = process.env.MONGO_HOST || '127.0.0.1';
  const port = process.env.MONGO_PORT || '27017';
  const database = process.env.MONGO_DB_NAME || 'qa_platform';
  const username = process.env.MONGO_USERNAME;
  const password = process.env.MONGO_PASSWORD;
  const authSource = process.env.MONGO_AUTH_SOURCE || database;
  const credentials = username && password ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';
  const authQuery = username && password ? `?authSource=${encodeURIComponent(authSource)}` : '';

  return `mongodb://${credentials}${host}:${port}/${database}${authQuery}`;
}

async function main() {
  const client = new MongoClient(buildMongoUri(), {
    maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 5),
    serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 5000),
    connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 5000)
  });

  const dbName = process.env.MONGO_DB_NAME || 'qa_platform';
  const expectedIndexes = {
    test_results: [
      'idx_test_results_testName_runAt',
      'idx_test_results_status_runAt'
    ],
    defect_logs: [
      'idx_defect_logs_severity_detectedAt',
      'idx_defect_logs_endpoint'
    ],
    gap_reports: [
      'idx_gap_reports_endpoint_generatedAt'
    ],
    spec_endpoints: [
      'idx_spec_endpoints_path_method'
    ]
  };

  try {
    await client.connect();
    const db = client.db(dbName);
    let failures = 0;

    for (const [collectionName, expectedNames] of Object.entries(expectedIndexes)) {
      const indexes = await db.collection(collectionName).indexes();
      const indexNames = new Set(indexes.map(index => index.name));
      for (const expectedName of expectedNames) {
        if (indexNames.has(expectedName)) {
          console.log(`PASS ${collectionName}.${expectedName}`);
        } else {
          console.log(`FAIL ${collectionName}.${expectedName}`);
          failures += 1;
        }
      }
    }

    process.exitCode = failures > 0 ? 1 : 0;
  } catch (error) {
    console.error(`FAIL index verification: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await client.close().catch(() => {});
  }
}

main();
