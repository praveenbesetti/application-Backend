const crypto =require('crypto')
const {State, District, Mandal, Secretariat}=require('../models/surveySchemas')
const {Survey} = require('../models/SurveySchema')
const mongoose = require('mongoose');
const { generateAgentId } = require('../../generateId');




 const submitSurveyForm = async (req, res) => {
    try {
        const { 
            villageId, 
            surveyorId, 
            stateName, 
            districtName, 
            MandalName, 
            VillageName 
        } = req.body;
    
        // 1. FIX: Map the local variables to the keys expected by generateAgentId
        req.body.surveyId = generateAgentId({ 
            state: stateName, 
            district: districtName, 
            mandal: MandalName, // This satisfies the !mandal check
            village: VillageName,
            user:  true
        });

        // 2. Add the survey (This happens regardless of surveyorId)
        const survey = new Survey(req.body);
        await survey.save();

        // 3. LOGIC: If surveyorId exists AND villageId is not empty, update count
        if (surveyorId && villageId) {
            const updatedVillage = await Secretariat.findOneAndUpdate(
                { 
                    _id: new mongoose.Types.ObjectId(villageId), 
                    "subagents.surveyorId": surveyorId  // Ensure this matches your Schema (subagents vs subAgent)
                },
                { 
                    $inc: { "subagents.$.count": 1 } 
                },
                { new: true }
            );

            if (!updatedVillage) {
                console.log(`⚠️ Survey saved, but surveyor ${surveyorId} not found in village ${villageId}`);
            }
        }

        // 4. Success Response
        res.status(201).json({
            success: true,
            message: "Survey saved successfully",
            surveyId: survey.surveyId
        });

    } catch (err) {
        console.error("Submit Error:", err.message);
        res.status(400).json({ error: err.message });
    }
};

module.exports={submitSurveyForm}