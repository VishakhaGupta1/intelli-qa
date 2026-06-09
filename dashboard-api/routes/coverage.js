const router = require('express').Router();
const { getDb } = require('../db');
const { query } = require('express-validator');
const { sendValidationErrors } = require('../validation');

function canonicalPath(path) {
  return (path || '').split('?')[0].replace(/\/+$/, '') || '/';
}

function specPathToRegex(path) {
  const escaped = canonicalPath(path)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\{[^}]+\\\}/g, '[^/]+');
  return new RegExp(`^${escaped}$`);
}

function parseEndpoint(endpoint) {
  const parts = String(endpoint || '').split(' ');
  if (parts.length >= 2) {
    const method = parts[0].toUpperCase();
    const knownMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
    if (knownMethods.includes(method)) {
      return { method, path: canonicalPath(parts.slice(1).join(' ')) };
    }
  }
  // If no clear method found, return path and null method
  return { method: null, path: canonicalPath(endpoint) };
}

const validateCoverageQuery = [
  query('tag').optional().isLength({ min: 1, max: 50 }).matches(/^[a-zA-Z0-9-]+$/).withMessage('Must be alphanumeric or dash, max 50 chars')
];

router.get('/', validateCoverageQuery, async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.json({ covered: [], uncovered: [], coveragePercent: 0 });
    if (sendValidationErrors(req, res)) return;

    const endpoints = await db.collection('spec_endpoints').find({}).toArray();
    const results = await db.collection('test_results').find({ status: { $in: ['passed', 'PASS'] } }).toArray();
    
    // Debug log to see what's being compared
    console.log(`Coverage check: ${endpoints.length} spec endpoints, ${results.length} passed results`);

    const filteredEndpoints = req.query.tag ? endpoints.filter(endpoint => String(endpoint.tag || 'untagged') === req.query.tag) : endpoints;
    const testedEndpoints = results.map(result => parseEndpoint(result.endpoint)).filter(item => item.method && item.path.length > 0);
    const covered = [];
    const uncovered = [];

    for (const endpoint of filteredEndpoints) {
      const endpointRegex = specPathToRegex(endpoint.path);
      const matched = testedEndpoints.some(item => {
        const methodMatch = !item.method || item.method === (endpoint.method || '').toUpperCase();
        return methodMatch && endpointRegex.test(item.path);
      });
      const payload = {
        path: endpoint.path,
        method: (endpoint.method || '').toUpperCase(),
        summary: endpoint.summary || '',
        tag: endpoint.tag || 'untagged'
      };
      if (matched) {
        covered.push(payload);
      } else {
        uncovered.push(payload);
      }
    }

    const total = filteredEndpoints.length;
    res.json({
      covered,
      uncovered,
      coveragePercent: total > 0 ? Math.round((covered.length / total) * 100) : 0,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
module.exports = router;
