const crypto = require('crypto');
const { State, District, Mandal, Secretariat } = require('../models/surveySchemas')

const authenticateUser = async (req, res) => {
    try {
        const { role, mandalId, village, username, password, token } = req.body;

        if (role === 'agent') {
            // 1. Find Mandal and populate its District and the District's State
            const mandal = await Mandal.findById(mandalId)
                .populate({
                    path: 'district_id',
                    populate: { path: 'state_id' }
                })
                .lean();

            // 2. Validate Mandal and Credentials
            if (!mandal || mandal.ManAgent?.userName !== username || mandal.ManAgent?.password !== password) {
                return res.status(401).json({ error: "Invalid Agent credentials." });
            }

            // 3. Check if Agent is Active/Not Deleted
            if (!mandal.ManAgent.active || mandal.ManAgent.delete) {
                return res.status(403).json({ error: "Account suspended or inactive. Contact Admin." });
            }

            // 4. Extract names from the populated paths
            const responseData = {
                _id: mandal.ManAgent._id, // Agent's internal ID
                name: mandal.ManAgent.name,
                mandalId: mandal._id,
                mandalName: mandal.name,
                districtName: mandal.district_id?.name || "N/A",
                stateName: mandal.district_id?.state_id?.name || "N/A",
                agentId: mandal.ManAgent.AgentId,
                phone: mandal.ManAgent.phone
            };

            return res.json({
                success: true,
                data: responseData
            });
        }

        if (role === 'subagent') {
            const newToken = crypto.randomBytes(3).toString('hex').toUpperCase();

            const result = await Secretariat.findOneAndUpdate(
                {
                    name: { $regex: new RegExp(`^${village.trim()}$`, "i") },
                    mandalId,
                    "subagents.username": username,
                    "subagents.password": password,
                    "subagents.token": token,
                    "subagents.isAuthorized": true
                },
                { $set: { "subagents.$.token": newToken } },
                { new: true }
            ).populate({
                path: 'mandalId',
                populate: {
                    path: 'districtId',
                    populate: { path: 'stateId' }
                }
            });

            if (!result) return res.status(401).json({ error: "Invalid credentials." });

            const currentAgent = result.subagents.find(agent => agent.username === username);

            return res.json({
                success: true,
                data: {
                    villageId: result._id,
                    villageName: result.name,
                    SurveyorId: currentAgent.surveyorId, // Returning the string ID
                    mandalName: result.mandalId?.name,
                    districtName: result.mandalId?.districtId?.name,
                    // 📍 Accessing the State Name
                    stateName: result.mandalId?.districtId?.stateId?.name || "N/A",
                    token: newToken
                }
            });
        }
        res.status(400).json({ error: "Invalid role." });
    } catch (err) {
        res.status(500).json({ error: "Internal server error." });
    }
};
module.exports = { authenticateUser };