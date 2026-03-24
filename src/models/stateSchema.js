const mongoose = require('mongoose');

const stateSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }, // e.g., "Andhra Pradesh"
    stateCode: { type: String, unique: true }           // e.g., "AP"
}, { timestamps: true });

 const State = mongoose.model('State', stateSchema);

module.exports=State