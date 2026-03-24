const express = require('express');
const { getDistrictsByState } = require('../controllers/districController.js');

const router = express.Router();

// GET districts by State ID
router.get('/state/:stateId', getDistrictsByState);

// Correct CommonJS export
module.exports = router;