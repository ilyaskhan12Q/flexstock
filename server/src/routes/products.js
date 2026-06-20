const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const productsController = require('../controllers/products');
const { authenticate, authorize } = require('../middleware/auth');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// CSV memory storage
const csvUpload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

// CRUD
router.get('/', productsController.getProducts);
router.get('/:id', productsController.getProductById);

router.post('/', authorize(['ADMIN', 'MANAGER']), upload.single('image'), productsController.createProduct);
router.patch('/:id', authorize(['ADMIN', 'MANAGER']), upload.single('image'), productsController.updateProduct);
router.delete('/:id', authorize(['ADMIN']), productsController.deleteProduct);

// Bulk Import
router.post('/import', authorize(['ADMIN', 'MANAGER']), csvUpload.single('file'), productsController.importProducts);

module.exports = router;
