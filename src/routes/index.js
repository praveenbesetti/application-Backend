const express = require('express');
const Village = require('./villagesRoute.js');
const District = require('./district.js');
const Mandal = require('./mandalRoute.js');
const Auth = require('./authRouter.js');
const SurveyForm = require('./surveyFormRoute.js');
const surveyData = require('./surveyDataRoute.js');
const webAuth = require('./loginrouter.js');
const State = require('./stateRoute.js');

const router = express.Router();

router.use('/survey/auth', Auth);
router.use('/districts', District);
router.use('/mandals', Mandal);
router.use('/villages', Village);
router.use('/surveys', SurveyForm);
router.use('/survey-data', surveyData);
router.use('/states', State);
router.use('/web-auth', webAuth);

module.exports = router;