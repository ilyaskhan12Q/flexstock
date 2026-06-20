const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const settingsController = require('../controllers/settings');
const { authenticate, authorize } = require('../middleware/auth');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    cb(null, `logo-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

// All settings routes require authentication
router.use(authenticate);

// Settings — Admin only for writes, all can read
router.get('/', settingsController.getSettings);
router.patch('/', authorize(['ADMIN']), upload.single('logo'), settingsController.updateSettings);

// Locations
router.get('/locations', settingsController.getLocations);
router.post('/locations', authorize(['ADMIN']), settingsController.addLocation);
router.delete('/locations/:name', authorize(['ADMIN']), settingsController.removeLocation);

// Backup
router.get('/backup', authorize(['ADMIN']), settingsController.exportBackup);

module.exports = router;
