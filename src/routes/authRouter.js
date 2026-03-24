const express = require('express');
// Destructure the function from the controller
const { authenticateUser } = require('../controllers/authController.js');

const router = express.Router();

// This line was crashing because authenticateUser was undefined
router.post('/login', authenticateUser);

module.exports = router;