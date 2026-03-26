const { generateAgentId } = require('../../generateId');
const crypto = require('crypto'); // Ensure this is at the top of your file
const { Secretariat } = require('../models/surveySchemas');


const generate6HexToken = () => {
    // 3 bytes = 6 hex characters (0-9, A-F)
    return crypto.randomBytes(3).toString('hex').toUpperCase();
};

// Example Output: "4A2B9C"
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
            token:generate6HexToken(),
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
        const { name, phoneNumber, username, password, active, delete: del } = req.body;

        const updateFields = {};

        // 1. Matches "name" in AgentsSchema
        if (name !== undefined) updateFields["subAgent.$.name"] = name;
        
        // 2. Matches "phone" in AgentsSchema
        if (phoneNumber !== undefined) updateFields["subAgent.$.phone"] = phoneNumber;
        
        // 3. FIXED: Matches "userName" (Capital N) in AgentsSchema
        if (username !== undefined) updateFields["subAgent.$.userName"] = username;
        
        // 4. Matches "password" in AgentsSchema
        if (password !== undefined) updateFields["subAgent.$.password"] = password;
        
        // 5. Matches "delete" in AgentsSchema (using 'del' from destructuring)
        if (del !== undefined) updateFields["subAgent.$.delete"] = del;
        
        // 6. Matches "active" in AgentsSchema
        if (active !== undefined) updateFields["subAgent.$.active"] = active;

       

        const village = await Secretariat.findOneAndUpdate(
            { _id: villageId, "subAgent._id": agentId },
            { $set: updateFields },
            { new: true, runValidators: true }
        );

        if (!village) {
            return res.status(404).json({ success: false, message: "Secretariat or Agent not found" });
        }

        res.json({ success: true, data: village });
    } catch (err) {
        console.error("Update Error:", err);
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

const getVillages = async (req, res) => {
    try {
        const villages = await Secretariat.find(
            { mandal_id: req.params.mandalId }, 
            { name: 1, _id: 1 } // Use the object-style projection to be explicit
        ).lean();

        if (!villages || villages.length === 0) {
            return res.status(200).json([]);
        }

        // Mapping manually to ensure the structure is exactly what you want
        const cleanedVillages = villages.map(v => ({
            _id: v._id.toString(), // Ensure _id is a string
            name: v.name
        }));

        res.json(cleanedVillages); 
    } catch (err) {
        res.status(500).json({ error: "Server Error: " + err.message });
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