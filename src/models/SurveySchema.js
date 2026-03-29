const mongoose = require('mongoose');

const ConsumptionItemSchema = new mongoose.Schema({
    value: Number,
    unit: String,
    originalInput: String
}, { _id: false })

const SurveySchema = new mongoose.Schema({

    surveyId: { type: String, unique: true },
    surveyorId: String,
   
    wardArea: String,
    doorNumber: String,
    familyHead: String,
    mobile: [String],
    stateName: String,
    districtName: String,
    MandalName: String,
    VillageName: String,
    familyMembers: String,
    familyMembersMax: Number,
    familyType: String,
    occupation: String,
    grocerySource: String,
    monthlySpending: String,
    monthlySpendingMax: Number,
    purchaseFrequency: String,

    consumption: {

        rice: ConsumptionItemSchema,
        wheat: ConsumptionItemSchema,
        toorDal: ConsumptionItemSchema,
        moongDal: ConsumptionItemSchema,
        chanaDal: ConsumptionItemSchema,
        oil: ConsumptionItemSchema,
        sugar: ConsumptionItemSchema,
        salt: ConsumptionItemSchema,
        tea: ConsumptionItemSchema,
        milk: ConsumptionItemSchema,
        eggs: ConsumptionItemSchema,
        bathSoap: ConsumptionItemSchema,
        shampoo: ConsumptionItemSchema,
        detergent: ConsumptionItemSchema,
        dishWash: ConsumptionItemSchema,
        toothpaste: ConsumptionItemSchema,
        other: ConsumptionItemSchema

    },

    brandedPreference: String,
    productType: String,
    cheaperOption: String,
    orderMethod: String

}, { timestamps: true })

/* Indexes for faster filtering */

SurveySchema.index({ stateName: 1 })
SurveySchema.index({ districtName: 1 })
SurveySchema.index({ MandalName: 1 })
SurveySchema.index({ VillageName: 1 })

/* Best index for cascading dropdown filtering */

SurveySchema.index({
    stateName: 1,
    districtName: 1,
    MandalName: 1,
    VillageName: 1
})

 const Survey = mongoose.model("Survey", SurveySchema)

 module.exports={Survey}