const express = require('express');
const { submitSurveyForm } = require('../controllers/surveyForm.js');

const router = express.Router();

// POST route for form submission
router.post('/form', submitSurveyForm);

// Export using CommonJS
module.exports = router;