const { validationResult } = require('express-validator');

function sendValidationErrors(req, res) {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return false;
  }

  return res.status(400).json({
    error: 'Validation failed',
    details: result.array({ onlyFirstError: true }).map(item => ({
      field: item.path,
      message: item.msg,
    }))
  });
}

module.exports = { sendValidationErrors };
