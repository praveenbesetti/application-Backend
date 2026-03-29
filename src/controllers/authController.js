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

            // 1. First, find the Village and the specific Subagent to verify credentials
            const result = await Secretariat.findOne({
                name: { $regex: new RegExp(`^${village.trim()}$`, "i") },
                mandal_id: mandalId,
                "subAgent.userName": username,
                "subAgent.password": password,
                "subAgent.token": token
            }).populate({
                path: 'mandal_id',
                populate: {
                    path: 'district_id',
                    populate: { path: 'state_id' }
                }
            });

            // 2. Verification Checks
            if (!result) {
                return res.status(401).json({ error: "Invalid credentials or token." });
            }

            // Locate the specific agent in the array
            const currentAgent = result.subAgent.find(agent =>
                agent.userName.toLowerCase() === username.toLowerCase()
            );

            // Check if account is active/not deleted
            if (!currentAgent || !currentAgent.active || currentAgent.delete) {
                return res.status(403).json({ error: "Account suspended. Contact Admin." });
            }

            // 3. Credentials are now VERIFIED. Now generate and update the token.
            const newToken = crypto.randomBytes(3).toString('hex').toUpperCase();

            await Secretariat.updateOne(
                { _id: result._id, "subAgent._id": currentAgent._id },
                { $set: { "subAgent.$.token": newToken } }
            );

            // 4. Construct Response
            const responseData = {
                villageId: result._id,
                villageName: result.name,
                SurveyorId: currentAgent.AgentId || "",
                mongoId: currentAgent._id,
                mandalName: result.mandal_id?.name || "N/A",
                districtName: result.mandal_id?.district_id?.name || "N/A",
                stateName: result.mandal_id?.district_id?.state_id?.name || "N/A",
                token: newToken, // Send the newly generated token
                role: 'subagent'
            };

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