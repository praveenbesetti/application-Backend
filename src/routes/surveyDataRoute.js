const express = require('express');
const { getGroupedSurveyData } = require('../controllers/SurveyDataController.js');

const router = express.Router();

// GET grouped survey data
router.get('/grouped', getGroupedSurveyData);

// Export using CommonJS
module.exports = router;