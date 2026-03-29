
const { generateAgentId } = require('../../generateId');
const { Mandal } = require('../models/surveySchemas')
const getMandals = async (req, res) => {
    try {
        const mandals = await Mandal.find({
            district_id: req.params.districtId
        }, 'name')
            .sort({ name: 1 })
            .lean();
        res.json(mandals);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Ensure 'res' is the second argument!
const getAgentDetailsByDistrict = async (req, res) => {

    try {
        const mandals = await Mandal.find({ district_id: req.params.districtId })

        res.json(mandals);
    } catch (err) {
        // The check for 'res' prevents the crash you saw earlier
        if (res) {
            res.status(500).json({ error: err.message });
        }
    }
};


const AddAgentToMandal = async (req, res) => {
    // Destructure everything coming from your Ant Design form
    const { 
        agentname, phone, username, status, password, 
        mandalId, mandalName, districtName, stateName 
    } = req.body;

    try {
        // 1. Generate the ID (Ensure this function is imported or defined)
        // Fixed: Added 'const' to prevent ReferenceError
        const AgentId = generateAgentId({ 
            state: stateName, 
            district: districtName, 
            mandal: mandalName 
        });

        // Fixed: Logged 'agentname' (the destructured variable) instead of 'name'
        console.log(`🚀 Adding Agent: ${agentname} | ID: ${AgentId} | Mandal: ${mandalName}`);

        // 2. Find the specific Mandal
        const mandal = await Mandal.findById(mandalId);

        if (!mandal) {
            return res.status(404).json({ success: false, message: "Mandal not found" });
        }

        // 3. Prevent overwriting if an agent already exists
        if (mandal.ManAgent && mandal.ManAgent.AgentId) {
            return res.status(400).json({ 
                success: false, 
                message: "An agent is already assigned to this Mandal. Please use the Edit feature instead." 
            });
        }

        // 4. Map the payload to your Schema
        mandal.ManAgent = {
            name: agentname || '',
            phone: phone || '',
            userName: username || '', // Maps 'username' from form to 'userName' in schema
            password: password || '',
            AgentId: AgentId || '',
            delete: false,
            active: status // Uses the boolean from your switch
        };

        // 5. Save the document
        await mandal.save();

        res.status(200).json({
            success: true,
            message: "Agent details successfully linked to Mandal",
            data: {
                agentId: AgentId,
                mandal: mandal.name,
                agent: agentname
            }
        });

    } catch (err) {
        console.error("❌ Controller Error:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};


const updateMandalAgent = async (req, res) => {
    try {
        const { mandalId } = req.params;
        const { agentname, phone, username, password, status } = req.body;

        const updatedMandal = await Mandal.findByIdAndUpdate(
            mandalId,
            {
                $set: {
                    // Mapping frontend data to the ManAgent sub-schema
                    "ManAgent.name": agentname,
                    "ManAgent.phone": phone,
                    "ManAgent.userName": username, // Schema uses userName (capital N)
                    "ManAgent.password": password,
                    "ManAgent.active": status ?? true // Maps frontend 'status' to 'active'
                }
            },
            { new: true, runValidators: true }
        );

        if (!updatedMandal) {
            return res.status(404).json({ success: false, message: "Mandal not found" });
        }

        res.json({ success: true, data: updatedMandal });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = {
    getMandals,
    updateMandalAgent,
    getAgentDetailsByDistrict,
    AddAgentToMandal,
}