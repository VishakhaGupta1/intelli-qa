require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { randomUUID, timingSafeEqual } = require('crypto');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const promClient = require('prom-client');
const logger = require('./logger');
const { connectDb, closeDb, getDb } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GENERAL_API_LIMITER = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limit_exceeded', message: 'Too many API requests from this IP' },
});
const TOKEN_LIMITER = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limit_exceeded', message: 'Too many token requests from this IP' },
});

const register = promClient.register;
promClient.collectDefaultMetrics({ register });

const apiRequestsTotal = new promClient.Counter({
  name: 'qa_api_requests_total',
  help: 'Total API requests by route and status code',
  labelNames: ['route', 'status_code'],
  registers: [register],
});

const apiDurationSeconds = new promClient.Histogram({
  name: 'qa_api_duration_seconds',
  help: 'API request duration in seconds by route',
  labelNames: ['route'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [register],
});

const testResultsTotal = new promClient.Gauge({
  name: 'qa_test_results_total',
  help: 'Total test results stored in MongoDB',
  registers: [register],
});

const grokCallsTotal = new promClient.Counter({
  name: 'qa_grok_calls_total',
  help: 'Total Grok API calls recorded by the Python generator',
  registers: [register],
});

let lastObservedGrokCalls = 0;

function normalizeIp(ip) {
  return String(ip || '').replace(/^::ffff:/, '');
}

function ipToLong(ip) {
  const parts = normalizeIp(ip).split('.').map(part => Number(part));
  if (parts.length !== 4 || parts.some(part => Number.isNaN(part) || part < 0 || part > 255)) {
    return null;
  }
  return ((parts[0] << 24) >>> 0) + ((parts[1] << 16) >>> 0) + ((parts[2] << 8) >>> 0) + (parts[3] >>> 0);
}

function ipMatchesCidr(ip, cidr) {
  const [baseIp, prefixString] = String(cidr || '').split('/');
  const prefix = Number(prefixString);
  if (Number.isNaN(prefix) || prefix < 0 || prefix > 32) {
    return false;
  }
  const ipLong = ipToLong(ip);
  const baseLong = ipToLong(baseIp);
  if (ipLong === null || baseLong === null) {
    return false;
  }
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipLong & mask) === (baseLong & mask);
}

function isAllowedMetricsIp(ip) {
  const allowedEntries = (process.env.METRICS_ALLOWED_SUBNETS || '127.0.0.1,::1,172.16.0.0/12')
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
  const normalized = normalizeIp(ip);
  return allowedEntries.some(entry => {
    if (entry.includes('/')) {
      return ipMatchesCidr(normalized, entry);
    }
    return normalized === entry || normalized === entry.replace(/^::ffff:/, '');
  });
}

function routeLabel(req) {
  const routePath = req.route ? `${req.baseUrl || ''}${req.route.path || req.path}` : req.path;
  return `${req.method} ${String(routePath || req.path).replace(/\/+$/, '')}`;
}

function safeTimingEqual(expected, actual) {
  const expectedBuffer = Buffer.from(String(expected ?? ''));
  const actualBuffer = Buffer.from(String(actual ?? ''));
  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function validateStartupSecrets() {
  const failures = [];
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    failures.push('JWT_SECRET must be set and at least 32 characters long');
  }
  if (!CLIENT_SECRET || CLIENT_SECRET.length < 32) {
    failures.push('CLIENT_SECRET must be set and at least 32 characters long');
  }
  if (failures.length > 0) {
    logger.error('fatal_startup_configuration', { failures });
    process.exit(1);
  }
}

async function refreshMongoMetrics() {
  try {
    const db = getDb();
    if (!db) {
      return;
    }

    const testResults = await db.collection('test_results').countDocuments({});
    testResultsTotal.set(testResults);

    const grokMetric = await db.collection('metrics').findOne({ name: 'qa_grok_calls_total' });
    const currentGrokCalls = Number(grokMetric?.value || 0);
    if (currentGrokCalls > lastObservedGrokCalls) {
      grokCallsTotal.inc(currentGrokCalls - lastObservedGrokCalls);
      lastObservedGrokCalls = currentGrokCalls;
    }
  } catch (error) {
    logger.error('metrics_refresh_failed', { error: error.message });
  }
}

function issueToken(req, res) {
  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'jwt_secret_not_configured', message: 'JWT_SECRET is not configured' });
  }

  const clientSecret = req.body?.client_secret;
  if (!clientSecret || !safeTimingEqual(CLIENT_SECRET, clientSecret)) {
    return res.status(401).json({ error: 'Invalid client secret' });
  }

  const subject = String(req.body?.subject || req.body?.clientId || 'dashboard-client');
  const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
  const token = jwt.sign(
    { sub: subject, scope: 'dashboard:read' },
    JWT_SECRET,
    { expiresIn, issuer: 'qa-intelligence-platform' }
  );

  res.json({ token, tokenType: 'Bearer', expiresIn });
}

function authenticateJwt(req, res, next) {
  if (process.env.DISABLE_AUTH === 'true') {
    return next();
  }

  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'jwt_secret_not_configured', message: 'JWT_SECRET is not configured' });
  }

  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'missing_token', message: 'Bearer token required for API access' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid_token', message: 'Invalid or expired token' });
  }
}

validateStartupSecrets();

const app = express();
app.set('trust proxy', true);

app.use((req, res, next) => {
  res.setTimeout(10000, () => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Request timeout' });
    }
  });
  next();
});

app.use((req, res, next) => {
  req.requestId = randomUUID();
  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const label = routeLabel(req);
    apiRequestsTotal.inc({ route: label, status_code: String(res.statusCode) });
    apiDurationSeconds.observe({ route: label }, durationMs / 1000);
    logger.info('http_request', {
      requestId: req.requestId,
      method: req.method,
      endpoint: req.path,
      statusCode: res.statusCode,
      durationMs
    });
  });
  next();
});

const defaultAllowedOrigins = [
  'https://intelliqa-production.up.railway.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

const configuredOrigins = (process.env.CORS_ORIGIN || process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([...
  defaultAllowedOrigins,
  ...configuredOrigins,
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  }
}));

app.use(express.json({ limit: '100kb' }));

app.get('/', (req, res) => {
  res.json({
    message: 'QA Intelligence Platform API',
    status: 'online',
    health: '/health',
    metrics: '/metrics'
  });
});

app.use('/api', GENERAL_API_LIMITER);
app.post('/api/auth/token', TOKEN_LIMITER, issueToken);

app.get('/metrics', async (req, res) => {
  if (!isAllowedMetricsIp(req.ip || req.socket.remoteAddress)) {
    return res.status(403).json({ error: 'forbidden', message: 'Metrics endpoint is restricted to internal IPs' });
  }

  await refreshMongoMetrics();
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/api', authenticateJwt);
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/ready', async (req, res) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(503).json({ status: 'not_ready', reason: 'database not connected' });
    }
    await db.admin().ping();
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'not_ready', reason: err.message });
  }
});

app.use('/api/results', require('./routes/results'));
app.use('/api/defects', require('./routes/defects'));
app.use('/api/coverage', require('./routes/coverage'));
app.use('/api/flakiness', require('./routes/flakiness'));
app.use('/api/gap-report', require('./routes/gapReport'));
app.use('/api/metrics', require('./routes/metrics'));
app.use('/api/trust-score', require('./routes/trustScore'));
app.use('/api/trust-scores', require('./routes/trustScore')); // Backward compatibility
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  logger.error('unhandled_error', {
    requestId: req.requestId,
    method: req.method,
    endpoint: req.path,
    error: err.message
  });
  res.status(500).json({ error: err.message || 'internal_server_error' });
});

const PORT = process.env.PORT || 3001;
connectDb().then(() => {
  refreshMongoMetrics();
  setInterval(refreshMongoMetrics, 60000).unref();
  const server = app.listen(PORT, () => logger.info('QA Dashboard API running on port %s', PORT));

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, closing gracefully');
    server.close(async () => {
      await closeDb();
      process.exit(0);
    });
  });
});
