const { District } = require('../models/surveySchemas');
const getDistrictsByState = async (req, res) => {
    try {
        const { stateId } = req.params;
        // Finding districts that match the stateId and sorting by name
        const districts = await District.find({ state_id:stateId }).sort({ name: 1 });
        
        res.json({ success: true, data: districts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Export the function using CommonJS
module.exports = { getDistrictsByState };