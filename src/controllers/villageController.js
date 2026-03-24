const { generateAgentId } = require('../../generateId');
const crypto = require('crypto'); // Ensure this is at the top of your file
const { Secretariat } = require('../models/surveySchemas');

const addSubAgent = async (req, res) => {
    try {
        const { villageId } = req.params;
        const { 
            name, phone, stateName, villageName, mandalName, 
            districtName, username, password, houseHolds, active, 
            delete: isDeleted // Destructure 'delete' using an alias to avoid JS reserved word error
        } = req.body;

        // 1. Generate the unique Agent ID
        const AgentId = generateAgentId({ 
            state: stateName, 
            district: districtName, 
            mandal: mandalName,
            village: villageName
        });

        // 2. Find the specific Village
        const village = await Secretariat.findById(villageId);
        if (!village) {
            return res.status(404).json({ success: false, message: "Village (Secretariat) not found" });
        }

        // 3. Calculate currently assigned households (Budget check)
        // Note: Ensure your schema defines subAgent as an ARRAY [Agents]
        const currentlyAssigned = village.subAgent?.reduce((sum, sa) => sum + (Number(sa.houseHolds) || 0), 0) || 0;
        const remainingHouses = village.house_count - currentlyAssigned;

        // 4. Validate Household Budget
        if (Number(houseHolds) > remainingHouses) {
            return res.status(400).json({ 
                success: false, 
                message: `Capacity Exceeded. Only ${remainingHouses} households available in this village.` 
            });
        }

        // 5. Create the Sub-Agent object (Mapping frontend 'username' to schema 'userName')
        const newSubAgent = {
            name: name || '',
            phone: phone || '',
            userName: username || '', // FIXED: Schema uses userName (CamelCase)
            password: password || '',
            AgentId: AgentId,
            count: 0,
            houseHolds: Number(houseHolds) || 0,
            active: active !== undefined ? active : true, // status flag
            delete: isDeleted !== undefined ? isDeleted : false // del flag
        };

        // 6. Push to the array and Save
        village.subAgent.push(newSubAgent);
        await village.save();

        console.log(`✅ Sub-Agent ${name} added to ${villageName}`);

        res.status(200).json({ 
            success: true, 
            message: "Sub-agent registered successfully",
            data: village 
        });

    } catch (err) {
        console.error("❌ Add SubAgent Error:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};


 const updateSubAgent = async (req, res) => {
    try {
        const { villageId, agentId } = req.params;
        const { name, phoneNumber, username, password, token, isAuthorized } = req.body;

        const updateFields = {};
        if (name !== undefined) updateFields["subagents.$.name"] = name;
        if (phoneNumber !== undefined) updateFields["subagents.$.phone"] = phoneNumber;
        if (username !== undefined) updateFields["subagents.$.username"] = username;
        if (password !== undefined) updateFields["subagents.$.password"] = password;
        if (token !== undefined) updateFields["subagents.$.token"] = token;
        if (isAuthorized !== undefined) updateFields["subagents.$.isAuthorized"] = isAuthorized;

        const village = await Secretariat.findOneAndUpdate(
            { _id: villageId, "subagents._id": agentId },
            { $set: updateFields },
            { new: true, runValidators: true }
        );

        if (!village) return res.status(404).json({ success: false, message: "Not found" });

        res.json({ success: true, data: village });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
const getSubagents = async (req, res) => {
    try {
        const villages = await Secretariat.find({ mandalId: req.params.mandalId }, 'name subagents')
            .sort({ name: 1 }).lean();
        const subagentList = villages.map(v => ({
            villageName: v.name,
            villageId: v._id,
            details: v.subagents
        }));
        res.json(subagentList);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

 const getVillages= async (req, res) => {
    try {
        const villages = await Secretariat.find({ mandal_id: req.params.mandalId }, 'name').lean();
        if (!villages || villages.length === 0) return res.status(200).json([]);
        res.json(villages.map(v => v.name));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

 const getVillagesByMandals = async (req, res) => {
    try {
        const { mandalId } = req.params;
        const villages = await Secretariat.find({ mandal_id:mandalId });
        res.json({ success: true, data: villages });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports={
    getVillagesByMandals,
    getVillages,
    getSubagents,
    addSubAgent,
    updateSubAgent
}