/**
 * Ward model
 * Manages hospital ward information including capacity and occupancy
 */
const mongoose = require('mongoose');

const WardSchema = new mongoose.Schema(
    {
        hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true, required: true },
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

WardSchema.index({ hospitalId: 1, name: 1 }, { unique: true });

// Virtual for available beds
WardSchema.virtual('availableBeds').get(function () {
    return Math.max(0, this.capacity - this.currentOccupancy);
});

// Virtual for occupancy percentage
WardSchema.virtual('occupancyPercentage').get(function () {
    if (this.capacity === 0) return 0;
    return Math.round((this.currentOccupancy / this.capacity) * 100);
});

// Ensure virtuals are included in JSON
WardSchema.set('toJSON', { virtuals: true });
WardSchema.set('toObject', { virtuals: true });

module.exports = mongoose.models.Ward || mongoose.model('Ward', WardSchema);
