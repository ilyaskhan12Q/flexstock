const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory');
const { authenticate } = require('../middleware/auth');

router.use(authenticate); // Require authentication for all inventory tasks

router.get('/', inventoryController.getInventory);
router.get('/low-stock', inventoryController.getLowStockList);
router.get('/movements', inventoryController.getMovementHistory);
router.get('/:productId', inventoryController.getInventoryByProduct);
router.post('/movement', inventoryController.createMovement);

module.exports = router;
