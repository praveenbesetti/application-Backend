const {Survey} =require('../models/SurveySchema')

 const getGroupedSurveyData = async (req, res) => {
    try {

        const { state, district, mandal } = req.query;

        let filter = {};
        let groupField = "$stateName";
        let level = "state";

        /* Apply filters */

        if (state) filter.stateName = state;
        if (district) filter.districtName = district;
        if (mandal) filter.MandalName = mandal;

        /* Decide grouping level */

        if (mandal) {
            groupField = "$VillageName";
            level = "village";
        }
        else if (district) {
            groupField = "$MandalName";
            level = "mandal";
        }
        else if (state) {
            groupField = "$districtName";
            level = "district";
        }

        const groupedData = await Survey.aggregate([

            { $match: filter },

            {
                $group: {

                    _id: groupField,

                    surveyCount: { $sum: 1 },

                    /* Safe numeric totals */

                    totalFamilyMembers: {
                        $sum: {
                            $toInt: { $ifNull: ["$familyMembersMax", 0] }
                        }
                    },
                    totalMonthlySpending: {
                        $sum: {
                            $toInt: { $ifNull: ["$monthlySpendingMax", 0] }
                        }
                    },

                    rice: { $sum: { $ifNull: ["$consumption.rice.value", 0] } },
                    wheat: { $sum: { $ifNull: ["$consumption.wheat.value", 0] } },
                    toorDal: { $sum: { $ifNull: ["$consumption.toorDal.value", 0] } },
                    moongDal: { $sum: { $ifNull: ["$consumption.moongDal.value", 0] } },
                    chanaDal: { $sum: { $ifNull: ["$consumption.chanaDal.value", 0] } },
                    oil: { $sum: { $ifNull: ["$consumption.oil.value", 0] } },
                    sugar: { $sum: { $ifNull: ["$consumption.sugar.value", 0] } },
                    salt: { $sum: { $ifNull: ["$consumption.salt.value", 0] } },
                    tea: { $sum: { $ifNull: ["$consumption.tea.value", 0] } },
                    milk: { $sum: { $ifNull: ["$consumption.milk.value", 0] } },
                    eggs: { $sum: { $ifNull: ["$consumption.eggs.value", 0] } },
                    bathSoap: { $sum: { $ifNull: ["$consumption.bathSoap.value", 0] } },
                    shampoo: { $sum: { $ifNull: ["$consumption.shampoo.value", 0] } },
                    detergent: { $sum: { $ifNull: ["$consumption.detergent.value", 0] } },
                    dishWash: { $sum: { $ifNull: ["$consumption.dishWash.value", 0] } },
                    toothpaste: { $sum: { $ifNull: ["$consumption.toothpaste.value", 0] } },
                    other: { $sum: { $ifNull: ["$consumption.other.value", 0] } },

                    /* Collect string values */

                    familyType: { $push: { $ifNull: ["$familyType", "Unknown"] } },
                    occupation: { $push: "$occupation" },
                    grocerySource: { $push: "$grocerySource" },
                    purchaseFrequency: { $push: "$purchaseFrequency" },
                    productType: { $push: "$productType" },
                    orderMethod: { $push: "$orderMethod" },
                    brandedPreference: { $push: "$brandedPreference" },
                    cheaperOption: { $push: "$cheaperOption" }

                }
            },

            {
                $project: {

                    _id: 0,

                    location: "$_id",

                    surveyCount: 1,
                    familyMembers: "$totalFamilyMembers",
                    monthlySpending: "$totalMonthlySpending",
                    totals: {
                        rice: "$rice",
                        wheat: "$wheat",
                        toorDal: "$toorDal",
                        moongDal: "$moongDal",
                        chanaDal: "$chanaDal",
                        oil: "$oil",
                        sugar: "$sugar",
                        salt: "$salt",
                        tea: "$tea",
                        milk: "$milk",
                        eggs: "$eggs",
                        bathSoap: "$bathSoap",
                        shampoo: "$shampoo",
                        detergent: "$detergent",
                        dishWash: "$dishWash",
                        toothpaste: "$toothpaste",
                       
                    },

                    familyType: 1,
                    occupation: 1,
                    grocerySource: 1,
                    purchaseFrequency: 1,
                    productType: 1,
                    orderMethod: 1,
                    brandedPreference: 1,
                    cheaperOption: 1

                }
            },

            { $sort: { location: 1 } }

        ]);

        /* Percentage calculator */

        const calculatePercentage = (arr) => {

            const valid = arr.filter(v => v && v !== "");
            const total = valid.length;

            if (total === 0) return [];

            const map = {};

            valid.forEach(v => {
                map[v] = (map[v] || 0) + 1;
            });

            return Object.entries(map).map(([key, value]) => ({
                value: key,
                percent: Number(((value / total) * 100).toFixed(2))
            }));

        };

        /* Final formatted response */

        const finalData = groupedData.map(item => ({

            location: item.location,

            surveyCount: item.surveyCount,

            totals: item.totals,
            familyMembers: item.familyMembers,
            monthlySpending: item.monthlySpending,

            distributions: {
                familyType: calculatePercentage(item.familyType),
                occupation: calculatePercentage(item.occupation),
                grocerySource: calculatePercentage(item.grocerySource),
                purchaseFrequency: calculatePercentage(item.purchaseFrequency),
                productType: calculatePercentage(item.productType),
                orderMethod: calculatePercentage(item.orderMethod),
                brandedPreference: calculatePercentage(item.brandedPreference),
                cheaperOption: calculatePercentage(item.cheaperOption)
            }

        }));

        res.json({
            success: true,
            level,
            totalLocations: finalData.length,
            data: finalData
        });

    } catch (err) {
        console.error("Grouped Survey Error:", err);
        res.status(500).json({ error: err.message });
    }
};

 

const getSurveys = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 50, // Default 50 as requested
            surveyId, 
            stateId, 
            districtId, 
            mandalId, 
            villageName,
            search 
        } = req.query;

        // 1. Initialize empty query - if no filters, this stays {} (returns all)
        let query = {};

        // 2. Conditionally apply filters only if they exist in request
        if (surveyId) {
            query.surveyId = { $regex: surveyId, $options: 'i' };
        }

        // Location Filters (Mapping query params to Schema keys)
        if (stateId) query.stateName = stateId; 
        if (districtId) query.districtName = districtId;
        if (mandalId) query.MandalName = mandalId;
        if (villageName) query.VillageName = villageName;

        // Search filter (Family Head or Mobile Array)
        if (search) {
            query.$or = [
                { familyHead: { $regex: search, $options: 'i' } },
                { mobile: { $regex: search } } 
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const pageSize = parseInt(limit);

        // 3. Execute - .sort({ createdAt: -1 }) ensures "latest" 50 are sent by default
        const [surveys, totalCount] = await Promise.all([
            Survey.find(query)
                .sort({ createdAt: -1 }) 
                .skip(skip)
                .limit(pageSize)
                .lean(),
            Survey.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            total: totalCount,
            currentPage: parseInt(page),
            pageSize: pageSize,
            data: surveys
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: "Server Error", 
            error: error.message 
        });
    }
};

const updateSurvey = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Prevent changing surveyId if it's meant to be immutable
        delete updateData.surveyId; 

        const updatedSurvey = await Survey.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedSurvey) {
            return res.status(404).json({ success: false, message: "Survey not found" });
        }

        res.status(200).json({
            success: true,
            message: "Survey updated successfully",
            data: updatedSurvey
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * DELETE /api/surveys/:id
 * Removes a survey from the database
 */
const deleteSurvey = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedSurvey = await Survey.findByIdAndDelete(id);

        if (!deletedSurvey) {
            return res.status(404).json({ success: false, message: "Survey not found" });
        }

        res.status(200).json({
            success: true,
            message: "Survey deleted successfully"
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};



    
   

module.exports={getGroupedSurveyData,getSurveys,updateSurvey, deleteSurvey}