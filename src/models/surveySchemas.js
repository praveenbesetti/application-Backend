const mongoose = require("mongoose");

// Define the Sub-schema
const AgentsSchema = new mongoose.Schema({
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    userName: { type: String, default: '' },
    password: { type: String, default: '' },
    AgentId: { type: String, default: '' },
    count: { type: Number, default: 0 },
    token:{type:String},
    houseHolds: { type: Number, default: 0 },
    delete: { type: Boolean, default: false },
    active: { type: Boolean, default: true }
});

// ─── State ────────────────────────────────────────────────────────────────────
const stateSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
}, { timestamps: true });

// ─── District ─────────────────────────────────────────────────────────────────
const districtSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    state_id: { type: mongoose.Schema.Types.ObjectId, ref: "State", required: true },
    DisAgents: AgentsSchema // FIXED: Removed { }
}, { timestamps: true });

districtSchema.index({ name: 1, state_id: 1 }, { unique: true });

// ─── Mandal ───────────────────────────────────────────────────────────────────
const mandalSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    district_id: { type: mongoose.Schema.Types.ObjectId, ref: "District", required: true },
    ManAgent: AgentsSchema // FIXED: Removed { }
}, { timestamps: true });

mandalSchema.index({ name: 1, district_id: 1 }, { unique: true });

// ─── Secretariat (Village) ────────────────────────────────────────────────────
const secretariatSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    mandal_id: { type: mongoose.Schema.Types.ObjectId, ref: "Mandal", required: true },
    house_count: { type: Number, default: 0 },
    subAgent: [AgentsSchema] // FIXED: Removed { }
}, { timestamps: true });

secretariatSchema.index({ name: 1, mandal_id: 1 }, { unique: true });

const State = mongoose.model("State", stateSchema);
const District = mongoose.model("District", districtSchema);
const Mandal = mongoose.model("Mandal", mandalSchema);
const Secretariat = mongoose.model("Secretariat", secretariatSchema);

module.exports = { State, District, Mandal, Secretariat };