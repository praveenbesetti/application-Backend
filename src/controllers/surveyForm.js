const crypto =require('crypto')
const {State, District, Mandal, Secretariat}=require('../models/surveySchemas')
const Survey = require('../models/SurveySchema')
const mongoose = require('mongoose');



function generateRandomLetters(length) {
    return crypto.randomBytes(length).toString('hex').slice(0, length).toUpperCase();
}



 const submitSurveyForm = async (req, res) => {
    try {
        const { villageId, surveyorId } = req.body;
        req.body.surveyId = `${generateRandomLetters(3)}-${crypto.randomInt(100000000, 999999999)}`;
        const survey = new Survey(req.body);
        await survey.save();

        const updatedVillage = await Secretariat.findOneAndUpdate(
            { 
                _id: new mongoose.Types.ObjectId(villageId), 
                "subagents.surveyorId": surveyorId          
            },
            { 
                $inc: { 
                    "subagents.$.count": 1    
                } 
            },
            { new: true }
        );

        // 4. Check if the update worked
        if (!updatedVillage) {
            console.log(`❌ Update failed: No village with ID ${villageId} found containing surveyor ${surveyorId}`);
            return res.status(201).json({
                success: true,
                message: "Survey saved, but failed to update sub-agent count.",
                surveyId: survey.surveyId
            });
        }

        // 5. Success Response with the fresh count
        const agentData = updatedVillage.subagents.find(a => a.surveyorId === surveyorId);

        res.status(201).json({
            success: true,
            message: "Survey saved and count updated",
            surveyId: survey.surveyId,
            agentCount: agentData?.count || 0
        });

    } catch (err) {
        console.error("Submit Error:", err.message);
        res.status(500).json({ error: "Internal server error: " + err.message });
    }
};

module.exports={submitSurveyForm}