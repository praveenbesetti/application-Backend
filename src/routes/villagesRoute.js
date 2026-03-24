const express = require('express');
// Destructuring the controller functions
const { 
  getVillagesByMandals, 
  addSubAgent, 
  updateSubAgent, 
  getVillages 
} = require('../controllers/villageController.js');

const router = express.Router();

// GET villages by Mandal ID
router.get('/mandal/:mandalId', getVillagesByMandals);

// GET all villages for a specific Mandal
router.get('/:mandalId', getVillages);

// POST to add a new sub-agent to a village
router.post('/:villageId/subagent', addSubAgent);

// PUT to update an existing sub-agent
router.put('/:villageId/subagent/:agentId', updateSubAgent);

// Standard CommonJS export
module.exports = router;