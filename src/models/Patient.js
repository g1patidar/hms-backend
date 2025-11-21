/**
 * Patient model
 * Includes embedded "journey" summary array for hybrid approach.
 * Supports soft-delete and deletion scheduling.
 */
const mongoose = require('mongoose');

const JourneyEntrySchema = new mongoose.Schema(
	{
		encounterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Encounter' },
		type: { type: String, trim: true }, // e.g., 'encounter', 'lab', etc.
		summary: { type: String, trim: true },
		timestamp: { type: Date, default: Date.now, index: true },
	},
	{ _id: false }
);

const PatientSchema = new mongoose.Schema(
	{
		hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true, required: true },
		firstName: { type: String, required: true, trim: true },
		lastName: { type: String, required: true, trim: true },
		dateOfBirth: { type: Date },
		gender: { type: String, enum: ['male', 'female', 'other', 'unknown'], default: 'unknown' },
		contact: {
			phone: { type: String, trim: true },
			email: { type: String, trim: true, lowercase: true },
			address: { type: String, trim: true },
		},
		assignedDoctor: { type: String, trim: true },
		admissionType: { type: String, trim: true },
		ward: { type: String, trim: true },
		bedNumber: { type: String, trim: true },
		journey: { type: [JourneyEntrySchema], default: [] },
	},
	{ timestamps: true }
);

PatientSchema.index({ createdAt: 1 });
PatientSchema.index({ lastName: 1, firstName: 1 });

module.exports =
	mongoose.models.Patient || mongoose.model('Patient', PatientSchema);


