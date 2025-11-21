/**
 * Hospital model
 * Minimal fields for tenancy.
 * Includes embedded wards array for ward management.
 */
const mongoose = require('mongoose');

const WardSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		type: {
			type: String,
			enum: ['General', 'ICU', 'Pediatric', 'Maternity', 'Emergency', 'Surgery', 'Other'],
			default: 'General'
		},
		capacity: { type: Number, required: true, min: 0 },
		currentOccupancy: { type: Number, default: 0, min: 0 },
		isActive: { type: Boolean, default: true },
	},
	{ timestamps: true }
);

const HospitalSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true, index: true },
		address: { type: String },
		metadata: { type: mongoose.Schema.Types.Mixed },
		wards: { type: [WardSchema], default: [] },
	},
	{ timestamps: true }
);

HospitalSchema.index({ createdAt: 1 });

module.exports =
	mongoose.models.Hospital || mongoose.model('Hospital', HospitalSchema);

