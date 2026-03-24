
const {State}= require('../models/surveySchemas')

const FetchStates = async (req, res) => {
    try {
        // Find all states and sort them by name (A to Z)
        const states = await State.find().sort({ name: 1 });

        if (!states || states.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "No states found in the database." 
            });
        }

        res.status(200).json({
            success: true,
            count: states.length,
            data: states
        });
    } catch (err) {
        console.error("Error fetching states:", err.message);
        res.status(500).json({ 
            success: false, 
            error: "Internal server error" 
        });
    }
};

module.exports={
    FetchStates
}