const express = require('express');
const { FetchStates } = require("../controllers/stateController.js");

const router = express.Router();

// GET all states
router.get('/', FetchStates);

// Export using CommonJS
module.exports = router;