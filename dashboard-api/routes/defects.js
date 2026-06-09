const router = require('express').Router();
const { getDb } = require('../db');
const { query } = require('express-validator');
const { sendValidationErrors } = require('../validation');

const validateDefectsQuery = [
  query('severity').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).withMessage('Must be LOW, MEDIUM, HIGH, or CRITICAL')
];

router.get('/', validateDefectsQuery, async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.json({ defects: [] });
    if (sendValidationErrors(req, res)) return;

    const severity = (req.query.severity || 'all').toUpperCase();
    const query = {};
    if (severity !== 'ALL') query.severity = severity;
    const defects = await db.collection('defect_logs')
      .find(query).sort({ detectedAt: -1 }).toArray();
    res.json({
      defects: defects.map(defect => ({
        endpoint: defect.endpoint,
        severity: defect.severity,
        message: defect.description,
        timestamp: defect.detectedAt,
      }))
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
module.exports = router;
