const router = require('express').Router();
const { getDb } = require('../db');
const { query } = require('express-validator');
const { sendValidationErrors } = require('../validation');

const validateFlakinessQuery = [
  query('threshold').optional().isFloat({ min: 0, max: 1 }).withMessage('Must be between 0 and 1').toFloat()
];

router.get('/', validateFlakinessQuery, async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.json({ flakyTests: [] });

    if (sendValidationErrors(req, res)) return;

    const threshold = Number(req.query.threshold ?? 0.2);
    const allResults = await db.collection('test_results').find({}).sort({ runAt: -1 }).toArray();

    const grouped = new Map();
    for (const result of allResults) {
      const key = `${result.testName || 'unknown'}|${result.layer || 'api'}`;
      const current = grouped.get(key) || {
        testName: result.testName || 'unknown',
        layer: result.layer || 'api',
        failCount: 0,
        totalRuns: 0,
        rootCause: result.failureType || 'REAL_BUG',
        lastSeen: result.runAt || null,
        flakinessScore: 0
      };
      current.totalRuns += 1;
      if (result.status === 'failed') {
        current.failCount += 1;
      }
      if (!current.lastSeen || (result.runAt && result.runAt > current.lastSeen)) {
        current.lastSeen = result.runAt;
      }
      current.flakinessScore = current.totalRuns > 0 ? Number((current.failCount / current.totalRuns).toFixed(2)) : 0;
      grouped.set(key, current);
    }

    const items = Array.from(grouped.values())
      .filter(item => item.flakinessScore >= threshold)
      .sort((a, b) => b.flakinessScore - a.flakinessScore || b.failCount - a.failCount)
      .slice(0, 10);

    res.json({ flakyTests: items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;