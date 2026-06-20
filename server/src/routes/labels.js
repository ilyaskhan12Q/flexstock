const express = require('express');
const router = express.Router();
const labelsController = require('../controllers/labels');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/barcode', labelsController.generateBarcodePNG);
router.post('/generate/pdf', labelsController.generateLabelPDF);
router.post('/generate/zpl', labelsController.generateZPL);

module.exports = router;
