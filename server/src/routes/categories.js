const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/categories');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate); // All category operations require logging in

router.get('/', categoriesController.getCategories);
router.get('/:id', categoriesController.getCategoryById);

// Schema configurations are restricted to ADMIN only
router.post('/', authorize(['ADMIN']), categoriesController.createCategory);
router.patch('/:id', authorize(['ADMIN']), categoriesController.updateCategory);
router.delete('/:id', authorize(['ADMIN']), categoriesController.deleteCategory);

module.exports = router;
