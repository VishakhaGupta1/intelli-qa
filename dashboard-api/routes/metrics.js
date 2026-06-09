const router = require('express').Router();
const { getDb } = require('../db');

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    if (!db) {
      return res.json({ totalTests: 0, passRate: 0, failRate: 0, avgDuration: 0, lastRun: null });
    }

    const totalTests = await db.collection('test_results').countDocuments({});
    const passed = await db.collection('test_results').countDocuments({ status: { $in: ['passed', 'PASS'] } });
    const failed = await db.collection('test_results').countDocuments({ status: { $in: ['failed', 'FAIL'] } });
    const avgDurationAgg = await db.collection('test_results').aggregate([
      { $group: { _id: null, avgDuration: { $avg: '$duration' } } }
    ]).toArray();
    const latestRun = await db.collection('test_results').find({}).sort({ runAt: -1 }).limit(1).toArray();
    res.json({
      totalTests,
      passRate: totalTests > 0 ? Math.round((passed / totalTests) * 100) : 0,
      failRate: totalTests > 0 ? Math.round((failed / totalTests) * 100) : 0,
      avgDuration: Math.round(avgDurationAgg[0]?.avgDuration || 0),
      lastRun: latestRun[0]?.runAt || null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;