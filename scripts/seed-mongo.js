const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:change-me@127.0.0.1:27017/qa_platform?authSource=admin';
const DB_NAME = 'qa_platform';

const testNames = [
  'GET /health returns ok',
  'GET /api/products returns all products',
  'GET /api/products/1 returns product details',
  'GET /api/products/99999 returns 404',
  'POST /api/products creates a product',
  'PUT /api/products/1 updates a product',
  'DELETE /api/products/1 deletes a product',
  'GET /api/users returns all users',
  'GET /api/users/1 returns user details',
  'POST /api/users creates a user',
  'GET /api/orders returns all orders',
  'POST /api/orders creates an order',
];

const endpoints = [
  { method: 'GET', path: '/health', covered: true },
  { method: 'GET', path: '/api/products', covered: true },
  { method: 'GET', path: '/api/products/1', covered: true },
  { method: 'GET', path: '/api/products/99999', covered: false },
  { method: 'POST', path: '/api/products', covered: true },
  { method: 'PUT', path: '/api/products/1', covered: true },
  { method: 'DELETE', path: '/api/products/1', covered: true },
  { method: 'GET', path: '/api/users', covered: true },
  { method: 'GET', path: '/api/users/1', covered: true },
  { method: 'POST', path: '/api/users', covered: true },
  { method: 'GET', path: '/api/orders', covered: true },
  { method: 'POST', path: '/api/orders', covered: true },
];

const defectTemplates = [
  { endpoint: '/api/products/99999', httpMethod: 'GET', severity: 'LOW', description: 'Missing product lookup returned an unexpected payload shape.', message: 'Expected 404 for a missing product id.' },
  { endpoint: '/api/products/1', httpMethod: 'PUT', severity: 'MEDIUM', description: 'Product update occasionally returns stale data in the dashboard.', message: 'Product price did not persist after update.' },
  { endpoint: '/api/users', httpMethod: 'POST', severity: 'LOW', description: 'User creation response omits the preferred role field on one path.', message: 'Missing role in created user response.' },
  { endpoint: '/api/orders', httpMethod: 'POST', severity: 'HIGH', description: 'Order creation can fail when the payload contains multiple products.', message: 'Order total calculation mismatch.' },
  { endpoint: '/api/orders/1', httpMethod: 'GET', severity: 'MEDIUM', description: 'Order lookup latency exceeds the expected threshold during local runs.', message: 'Slow order fetch observed in dashboard trend.' },
  { endpoint: '/health', httpMethod: 'GET', severity: 'LOW', description: 'Health check response missing cached version metadata in one report.', message: 'Health endpoint payload differed from expected sample.' },
  { endpoint: '/api/products', httpMethod: 'GET', severity: 'CRITICAL', description: 'Catalog list returned a transient server error in one historical run.', message: 'Catalog endpoint returned 500 during smoke run.' },
  { endpoint: '/api/users/1', httpMethod: 'GET', severity: 'MEDIUM', description: 'Single user lookup returned an incomplete email field.', message: 'Email field unexpectedly null.' },
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickStatus(index) {
  const bucket = index % 20;
  if (bucket < 16) return 'passed';
  if (bucket < 19) return 'failed';
  return 'skipped';
}

function pickTestName(index) {
  return testNames[index % testNames.length];
}

function randomTimestamp(daysBack) {
  const now = Date.now();
  const offset = randomInt(0, daysBack * 24 * 60 * 60 * 1000);
  return new Date(now - offset).toISOString();
}

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  await db.collection('test_results').deleteMany({});
  await db.collection('defect_logs').deleteMany({});
  await db.collection('gap_reports').deleteMany({});
  await db.collection('spec_endpoints').deleteMany({});

  const testResults = Array.from({ length: 50 }, (_, index) => {
    const status = pickStatus(index);
    const endpoint = endpoints[index % endpoints.length];
    return {
      testName: pickTestName(index),
      endpoint: `${endpoint.method} ${endpoint.path}`,
      layer: index % 5 === 0 ? 'ui' : 'api',
      status,
      duration: randomInt(200, 3000),
      failureMessage: status === 'failed' ? 'Synthetic failure generated for dashboard seeding.' : null,
      failureType: status === 'failed' ? 'assertion' : null,
      runId: `seed-${Math.ceil((index + 1) / 10)}`,
      runAt: randomTimestamp(7),
      timestamp: randomTimestamp(14),
      tags: index % 5 === 0 ? ['ui'] : ['api'],
    };
  });

  const defectLogs = defectTemplates.map((defect, index) => ({
    ...defect,
    status: index % 2 === 0 ? 'open' : 'triaged',
    expected: '200/201 response with stable JSON payload',
    actual: 'Observed a different status or incomplete payload',
    detectedAt: randomTimestamp(7),
    resolvedAt: index % 3 === 0 ? randomTimestamp(2) : null,
  }));

  const gapReports = [
    {
      report: 'Seed data gap report: coverage is limited; add edge-case and auth tests for critical endpoints.',
      flaggedEndpoints: [
        'GET /api/orders/1',
        'GET /api/products/99999',
        'GET /api/users/summary'
      ],
      generatedAt: new Date().toISOString()
    }
  ];

  await db.collection('test_results').insertMany(testResults);
  await db.collection('defect_logs').insertMany(defectLogs);
  await db.collection('gap_reports').insertMany(gapReports);
  await db.collection('spec_endpoints').insertMany(endpoints);

  // --- Narrative Arc for AI Trust Score ---
  // degradation -> detection -> healing -> recovery
  const narrativeScores = [72, 68, 64, 51, 63, 71, 79, 83, 87, 91];
  const narrativeArc = narrativeScores.map((score, i) => {
    const timestamp = new Date(Date.now() - (10 - i) * 3600000); // Hourly intervals
    return {
      timestamp: timestamp.toISOString(),
      overallScore: score,
      recentFailures: (i >= 3 && i <= 6) ? ['Synthetic failure for healing demo'] : [],
      evaluationId: `eval-narrative-${i}`
    };
  });

  try {
    const trustCol = db.collection('trust_evaluations');
    const count = await trustCol.countDocuments({ evaluationId: { $regex: 'eval-narrative' } });
    if (count === 0) {
      await trustCol.insertMany(narrativeArc);
      console.log(`Seed: Inserted ${narrativeArc.length} trust evaluations for narrative arc.`);
    }
  } catch (e) {
    console.error('Seed: Failed to insert trust narrative arc:', e.message);
  }

  await client.close();
  console.log('Seed process complete.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});