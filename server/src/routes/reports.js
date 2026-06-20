const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// Report routes
router.get('/stock', reportsController.getStockSummary);
router.get('/valuation', reportsController.getCategoryValuation);
router.get('/stock/export/pdf', reportsController.exportStockPDF);
router.get('/stock/export/excel', reportsController.exportStockExcel);

module.exports = router;
