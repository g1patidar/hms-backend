/**
 * Dashboard controller
 * Provides statistics and analytics for the hospital dashboard
 */
const asyncHandler = require("../utils/asyncHandler");
const { Patient, Encounter, Hospital } = require("../models");
const mongoose = require("mongoose");

/**
 * Get dashboard statistics
 * Returns total patients, admissions/discharges today, bed availability, and ward data
 */
const getDashboardStats = asyncHandler(async (req, res) => {
    const hospitalId = req.user?.hospitalId;

    if (!hospitalId) {
        return res.status(400).json({ error: "Hospital ID is required" });
    }

    const hospitalObjectId = new mongoose.Types.ObjectId(hospitalId);

    // Get start and end of today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Run all queries in parallel for better performance
    const [
        totalPatients,
        admittedToday,
        dischargedToday,
        hospital
    ] = await Promise.all([
        // Total patients count
        Patient.countDocuments({ hospitalId: hospitalObjectId }),

        // Patients admitted today (have admission encounter today)
        Encounter.countDocuments({
            hospitalId: hospitalObjectId,
            type: 'Admission',
            timestamp: { $gte: startOfDay, $lte: endOfDay },
            isDeleted: { $ne: true }
        }),

        // Patients discharged today
        Encounter.countDocuments({
            hospitalId: hospitalObjectId,
            type: 'Discharge',
            timestamp: { $gte: startOfDay, $lte: endOfDay },
            isDeleted: { $ne: true }
        }),

        // Get hospital with wards
        Hospital.findById(hospitalObjectId).lean()
    ]);

    console.log('Dashboard Stats Debug:');
    console.log('Hospital ID:', hospitalId);
    console.log('Hospital found:', !!hospital);
    console.log('Wards count:', hospital?.wards?.length);

    // Calculate bed statistics from hospital wards
    const wards = hospital?.wards || [];
    const activeWards = wards.filter(ward => ward.isActive !== false);
    const totalBeds = activeWards.reduce((sum, ward) => sum + (ward.capacity || 0), 0);
    const occupiedBeds = activeWards.reduce((sum, ward) => sum + (ward.currentOccupancy || 0), 0);
    const availableBeds = Math.max(0, totalBeds - occupiedBeds);
    const occupancyPercentage = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    // Transform ward data for frontend
    const wardData = activeWards.map(ward => ({
        _id: ward._id,
        name: ward.name,
        type: ward.type,
        patients: ward.currentOccupancy || 0,
        capacity: ward.capacity || 0,
        availableBeds: Math.max(0, (ward.capacity || 0) - (ward.currentOccupancy || 0)),
        occupancyPercentage: ward.capacity > 0
            ? Math.round((ward.currentOccupancy / ward.capacity) * 100)
            : 0
    }));

    res.json({
        data: {
            totalPatients,
            admittedToday,
            dischargedToday,
            availableBeds,
            totalBeds,
            occupiedBeds,
            occupancyPercentage,
            wards: wardData  // Include ward data in stats response
        }
    });
});

/**
 * Get ward occupancy data (kept for backward compatibility)
 * Returns detailed occupancy information for each ward
 */
const getWardOccupancy = asyncHandler(async (req, res) => {
    const hospitalId = req.user?.hospitalId;

    if (!hospitalId) {
        return res.status(400).json({ error: "Hospital ID is required" });
    }

    const hospitalObjectId = new mongoose.Types.ObjectId(hospitalId);

    const hospital = await Hospital.findById(hospitalObjectId).lean();

    if (!hospital) {
        return res.status(404).json({ error: "Hospital not found" });
    }

    // Get wards from hospital
    const wards = hospital.wards || [];
    const activeWards = wards.filter(ward => ward.isActive !== false);

    // Transform data for frontend
    const wardData = activeWards.map(ward => ({
        _id: ward._id,
        name: ward.name,
        type: ward.type,
        patients: ward.currentOccupancy || 0,
        capacity: ward.capacity || 0,
        availableBeds: Math.max(0, (ward.capacity || 0) - (ward.currentOccupancy || 0)),
        occupancyPercentage: ward.capacity > 0
            ? Math.round((ward.currentOccupancy / ward.capacity) * 100)
            : 0
    }));

    res.json({
        data: wardData
    });
});

module.exports = {
    getDashboardStats,
    getWardOccupancy
};
