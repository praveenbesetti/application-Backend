const express = require('express');
const { getGroupedSurveyData,getSurveys,updateSurvey,deleteSurvey } = require('../controllers/SurveyDataController.js');

const router = express.Router();

// GET grouped survey data
router.get('/grouped', getGroupedSurveyData);
router.get('/surveyData',getSurveys);
router.put('/:id', updateSurvey);
router.delete('/:id', deleteSurvey);
// Export using CommonJS
module.exports = router;