const express = require('express');
const router = express.Router();
const salesController = require('../controllers/sales');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', salesController.getSales);
router.get('/:id', salesController.getSaleById);
router.post('/', salesController.createSale);

module.exports = router;
