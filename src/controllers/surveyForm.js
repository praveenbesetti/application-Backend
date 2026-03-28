const crypto =require('crypto')
const {State, District, Mandal, Secretariat}=require('../models/surveySchemas')
const {Survey} = require('../models/SurveySchema')
const mongoose = require('mongoose');
const { generateAgentId } = require('../../generateId');


class SurveyWorker {
    constructor(concurrency = 40) {
        this.queue = [];
        this.concurrency = concurrency;
        this.active = 0;
    }

    enqueue(payload) {
        this.queue.push(payload);
        this.run();
    }

    async run() {
        if (this.active >= this.concurrency || this.queue.length === 0) return;

        this.active++;
        const task = this.queue.shift();

        try {
            // 1. Write to Survey Collection
            const newSurvey = new Survey(task.surveyData);
            await newSurvey.save();

            // 2. Increment Agent Count
            if (task.surveyorId && task.villageId) {
                await Secretariat.findOneAndUpdate(
                    { 
                        _id: new mongoose.Types.ObjectId(task.villageId), 
                        "subAgent.AgentId": task.surveyorId  
                    },
                    { $inc: { "subAgent.$.count": 1 } }
                );
            }
          
        } catch (err) {
            console.error("❌ Queue Process Error:", err.message);
        } finally {
            this.active--;
            this.run(); // Pick up next task
        }
    }
}

// Global instance: Handles 40 DB operations at a time
const worker = new SurveyWorker(40);

// ─── THE CONTROLLER ──────────────────────────────────────────────────────────
const submitSurveyForm = async (req, res) => {
    try {
        const { villageId, surveyorId, VillageName } = req.body;

        // 1. Generate ID immediately so the user has a reference
        const surveyId = generateAgentId({ 
            village: VillageName,
            user: true 
        });

        // 2. Prepare the task payload
        const task = {
            surveyorId,
            villageId,
            surveyData: {
                ...req.body,
                surveyId: surveyId
            }
        };

        worker.enqueue(task);

        // 4. Respond to user immediately
        res.status(202).json({
            success: true,
            surveyId: surveyId,
            message: "Survey queued for processing."
        });

    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

module.exports = { submitSurveyForm };