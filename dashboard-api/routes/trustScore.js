const router = require('express').Router();
const { getDb } = require('../db');

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    if (!db) {
      return res.json({ trustScores: [] });
    }

    // Query the latest 10 entries from trust_scores collection
    const scores = await db.collection('trust_scores')
      .find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();

    res.json({
      trustScores: scores
    });
  } catch (e) {
    console.error('Failed to fetch trust scores:', e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/history', async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.json({ history: [] });

    const history = await db.collection('trust_evaluations')
      .find({})
      .sort({ timestamp: 1 })
      .limit(20)
      .toArray();

    res.json({
      history: history.map(h => ({
        timestamp: h.timestamp,
        overallScore: h.overall_score || h.overallScore,
        healingActive: !!(h.recentFailures && h.recentFailures.length > 0)
      }))
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
