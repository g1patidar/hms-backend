/**
 * Encounter model
 * Detailed record referenced by Patient.
 * Includes meds, vitals, files, timestamp, and deleted flags.
 */
const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema(
	{
		url: { type: String, required: true },
		name: { type: String },
		mimeType: { type: String },
		size: { type: Number }, // bytes
	},
	{ _id: false }
);

const MedicationSchema = new mongoose.Schema(
	{
		name: { type: String, required: true },
		dose: { type: String },
		frequency: { type: String },
		route: { type: String },
		duration: { type: String },
	},
	{ _id: false }
);

const VitalsSchema = new mongoose.Schema(
	{
		bpSystolic: Number,
		bpDiastolic: Number,
		heartRate: Number,
		respRate: Number,
		tempC: Number,
		spo2: Number,
	},
	{ _id: false }
);

const EncounterSchema = new mongoose.Schema(
	{
		patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
		hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
		authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
		notes: { type: String },
		vitals: VitalsSchema,
		meds: { type: [MedicationSchema], default: [] },
		files: { type: [FileSchema], default: [] },
		type: {
			type: String,
			enum: ['Clinical', 'Discharge', 'Admission'],
			default: 'Clinical',
			index: true
		},
		timestamp: { type: Date, default: Date.now, index: true },
		isDeleted: { type: Boolean, default: false, index: true },
		deletedAt: { type: Date },
		deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
		deletedReason: { type: String },
	},
	{ timestamps: true }
);

EncounterSchema.index({ patientId: 1, timestamp: -1 });
EncounterSchema.index({ createdAt: 1 });

module.exports =
	mongoose.models.Encounter || mongoose.model('Encounter', EncounterSchema);
