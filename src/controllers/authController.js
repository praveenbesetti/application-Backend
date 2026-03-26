const crypto = require('crypto');
const { State, District, Mandal, Secretariat } = require('../models/surveySchemas')

const authenticateUser = async (req, res) => {
    try {
        const { role, mandalId, village, username, password, token } = req.body;

        // --- 1. AGENT LOGIN ---
        if (role === 'agent') {
            const mandal = await Mandal.findById(mandalId)
                .populate({
                    path: 'district_id',
                    populate: { path: 'state_id' }
                })
                .lean();

          
            if (
                !mandal ||
                mandal.ManAgent?.userName !== username ||
                mandal.ManAgent?.password !== password ||
                mandal.ManAgent?.active !== true ||   // Must be active
                mandal.ManAgent?.delete === true      // Must NOT be deleted
            ) {
                return res.status(401).json({
                    error: "Invalid Agent credentials or account is suspended."
                });
            }

            if (!mandal.ManAgent.active || mandal.ManAgent.delete) {
                return res.status(403).json({ error: "Account suspended. Contact Admin." });
            }

            const responseData = {
                _id: mandal.ManAgent._id,
                name: mandal.ManAgent.name,
                mandalId: mandal._id,
                mandalName: mandal.name,
                districtName: mandal.district_id?.name || "N/A",
                stateName: mandal.district_id?.state_id?.name || "N/A",
                agentId: mandal.ManAgent.AgentId,
                // We map AgentId to SurveyorId so the mobile app's Survey logic 
                // picks it up correctly as 'surveyorId' in the payload
                SurveyorId: mandal.ManAgent.AgentId,
                phone: mandal.ManAgent.phone,
                role: 'agent'
            };

            return res.json({ success: true, data: responseData });
        }

        // --- 2. SUBAGENT LOGIN ---
        if (role === 'subagent') {
            if (!token || token === 'N/A') {
                return res.status(400).json({ error: "Subagent token is required." });
            }

            const newToken = crypto.randomBytes(3).toString('hex').toUpperCase();

            // 1. Perform the update and populate exactly as per your schema definitions
            const result = await Secretariat.findOneAndUpdate(
                {
                    name: { $regex: new RegExp(`^${village.trim()}$`, "i") },
                    mandal_id: mandalId,
                    "subAgent.userName": username,
                    "subAgent.password": password,
                    "subAgent.token": token,
                    "subAgent.active": true,
                    "subAgent.delete": false
                },
                { $set: { "subAgent.$.token": newToken } },
                { new: true }
            ).populate({
                path: 'mandal_id',
                populate: {
                    path: 'district_id',
                    populate: { path: 'state_id' } // Matches districtSchema.state_id
                }
            });

            if (!result) {
                return res.status(401).json({ error: "Invalid credentials or token." });
            }

            // 2. Locate the specific agent in the subAgent array
            const currentAgent = result.subAgent.find(agent =>
                agent.userName.toLowerCase() === username.toLowerCase()
            );

            // 3. Construct the response with fallbacks
            const responseData = {
                villageId: result._id,
                villageName: result.name,
                // Match AgentId (the custom string ID)
                SurveyorId: currentAgent?.AgentId || "",
                // FIX: Adding the unique MongoDB _id of the sub-agent
                mongoId: currentAgent?._id || null,
                mandalName: result.mandal_id?.name || "N/A",
                districtName: result.mandal_id?.district_id?.name || "N/A",
                stateName: result.mandal_id?.district_id?.state_id?.name || "N/A",
                token: newToken,
                role: 'subagent'
            };

            return res.json({
                success: true,
                data: responseData
            });

            return res.json({
                success: true,
                data: responseData
            });
        }

        res.status(400).json({ error: "Invalid role." });
    } catch (err) {
        console.error("Auth Error:", err);
        res.status(500).json({ error: "Internal server error." });
    }
};
module.exports = { authenticateUser };