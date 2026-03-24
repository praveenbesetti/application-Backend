const express = require('express');
// Destructuring the controller functions from the required file
const { 
  getAgentDetailsByDistrict, 
  getMandals, 
  updateMandalAgent,
  AddAgentToMandal
} = require('../controllers/mandalController.js');

const router = express.Router();

// Routes
router.get('/agent/:districtId', getAgentDetailsByDistrict);
router.get('/:districtId', getMandals);
router.put('/:mandalId/agent', updateMandalAgent);
router.post('/agent',AddAgentToMandal)
// Export using CommonJS
module.exports = router;