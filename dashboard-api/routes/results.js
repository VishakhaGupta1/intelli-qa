const router = require('express').Router();
const { getDb } = require('../db');
const { query } = require('express-validator');
const { sendValidationErrors } = require('../validation');

const validateResultsQuery = [
	query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Must be between 1 and 1000').toInt(),
	query('page').optional().isInt({ min: 1 }).withMessage('Must be at least 1').toInt(),
	query('status').optional().isIn(['PASS', 'FAIL', 'SKIP']).withMessage('Must be PASS, FAIL, or SKIP'),
];

router.get('/', validateResultsQuery, async (req, res) => {
  try {
    const db = getDb();
    const limit = Number(req.query.limit || 100);
    const page = Number(req.query.page || 1);
    if (!db) {
      return res.json({ results: [], total: 0, page });
    }
    if (sendValidationErrors(req, res)) return;

    const statusMap = { PASS: 'passed', FAIL: 'failed', SKIP: 'skipped' };
    const status = req.query.status ? statusMap[String(req.query.status).toUpperCase()] : null;
    const queryFilter = status ? { status } : {};

    const total = await db.collection('test_results').countDocuments(queryFilter);
    const results = await db.collection('test_results')
		.find(queryFilter)
		.sort({ runAt: -1 })
		.skip((page - 1) * limit)
		.limit(limit)
		.toArray();

    res.json({ results, total, page });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/trend', async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.json([]);
    const days = Number(req.query.days || 14);
    const trend = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const start = new Date(dateStr);
      const end = new Date(dateStr);
      end.setDate(end.getDate() + 1);
      const dayResults = await db.collection('test_results')
        .find({ runAt: { $gte: start.toISOString(), $lt: end.toISOString() } }).toArray();
      const apiResults = dayResults.filter(r => (r.layer || 'api') === 'api');
      const uiResults = dayResults.filter(r => r.layer === 'ui');
      const apiPassed = apiResults.filter(r => r.status === 'passed').length;
      const uiPassed = uiResults.filter(r => r.status === 'passed').length;
      trend.push({
        date: dateStr,
        totalTests: dayResults.length,
        apiPassRate: apiResults.length > 0 ? Math.round((apiPassed / apiResults.length) * 100) : 0,
        uiPassRate: uiResults.length > 0 ? Math.round((uiPassed / uiResults.length) * 100) : 0
      });
    }
    res.json(trend);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
module.exports = router;
