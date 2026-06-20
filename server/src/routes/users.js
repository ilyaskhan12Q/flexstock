const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.use(authorize(['ADMIN'])); // User accounts can only be managed by ADMIN role

router.get('/', usersController.getUsers);
router.post('/', usersController.createUser);
router.patch('/:id', usersController.updateUser);
router.delete('/:id', usersController.deleteUser);

module.exports = router;
