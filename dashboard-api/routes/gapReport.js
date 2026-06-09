const router = require('express').Router();
const { getDb } = require('../db');
const { query } = require('express-validator');
const { sendValidationErrors } = require('../validation');

const validateGapQuery = [
  query('endpoint').optional().isLength({ min: 1, max: 200 }).matches(/^[\w\-./:?=&%]+$/).withMessage('Must be a URL-safe string up to 200 characters')
];

router.get('/', validateGapQuery, async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.json({ gaps: [] });
    if (sendValidationErrors(req, res)) return;

    const report = await db.collection('gap_reports')
      .findOne({}, { sort: { generatedAt: -1 } });
    if (!report) {
      return res.json({ gaps: [] });
    }
    const endpointFilter = req.query.endpoint ? String(req.query.endpoint) : null;
    const flaggedEndpoints = endpointFilter
      ? (report.flaggedEndpoints || []).filter(item => String(item).includes(endpointFilter))
      : (report.flaggedEndpoints || []);
    res.json({
      gaps: flaggedEndpoints.map(item => {
        const parts = String(item).split(' ', 2);
        return {
          method: parts[0] || 'GET',
          path: parts[1] || String(item),
          reason: report.report || 'Untested endpoint',
        };
      })
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
module.exports = router;
