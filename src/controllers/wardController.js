/**
 * Ward Management Controller
 * Endpoints for managing hospital wards (embedded in Hospital schema)
 */
const asyncHandler = require("../utils/asyncHandler");
const { body, param } = require("express-validator");
const validate = require("../middlewares/validate");
const { Hospital } = require("../models");
const mongoose = require("mongoose");

const createValidators = [
    body("name").isString().isLength({ min: 1 }),
    body("type").isIn(['General', 'ICU', 'Pediatric', 'Maternity', 'Emergency', 'Surgery', 'Other']),
    body("capacity").isInt({ min: 0 }),
    body("currentOccupancy").optional().isInt({ min: 0 }),
];

const updateValidators = [
    param("id").isMongoId(),
    body("name").optional().isString().isLength({ min: 1 }),
    body("type").optional().isIn(['General', 'ICU', 'Pediatric', 'Maternity', 'Emergency', 'Surgery', 'Other']),
    body("capacity").optional().isInt({ min: 0 }),
    body("currentOccupancy").optional().isInt({ min: 0 }),
    body("isActive").optional().isBoolean(),
];

const idParam = [param("id").isMongoId()];

/**
 * Create a new ward
 */
const createWard = asyncHandler(async (req, res) => {
    const hospitalId = req.user?.hospitalId;

    if (!hospitalId) {
        return res.status(400).json({ error: "Hospital ID is required" });
    }

    const hospital = await Hospital.findById(hospitalId);

    if (!hospital) {
        return res.status(404).json({ error: "Hospital not found" });
    }

    const newWard = {
        name: req.body.name,
        type: req.body.type,
        capacity: req.body.capacity,
        currentOccupancy: req.body.currentOccupancy || 0,
    };

    hospital.wards.push(newWard);
    await hospital.save();

    const createdWard = hospital.wards[hospital.wards.length - 1];
    res.status(201).json({ data: createdWard });
});

/**
 * Get all wards for the hospital
 */
const getWards = asyncHandler(async (req, res) => {
    const hospitalId = req.user?.hospitalId;

    if (!hospitalId) {
        return res.status(400).json({ error: "Hospital ID is required" });
    }

    const hospital = await Hospital.findById(hospitalId).lean();

    if (!hospital) {
        return res.status(404).json({ error: "Hospital not found" });
    }

    res.json({ data: hospital.wards || [] });
});

/**
 * Get a single ward by ID
 */
const getWard = asyncHandler(async (req, res) => {
    const hospitalId = req.user?.hospitalId;

    if (!hospitalId) {
        return res.status(400).json({ error: "Hospital ID is required" });
    }

    const hospital = await Hospital.findById(hospitalId).lean();

    if (!hospital) {
        return res.status(404).json({ error: "Hospital not found" });
    }

    const ward = hospital.wards?.find(w => w._id.toString() === req.params.id);

    if (!ward) {
        return res.status(404).json({ error: "Ward not found" });
    }

    res.json({ data: ward });
});

/**
 * Update a ward
 */
const updateWard = asyncHandler(async (req, res) => {
    const hospitalId = req.user?.hospitalId;

    if (!hospitalId) {
        return res.status(400).json({ error: "Hospital ID is required" });
    }

    const hospital = await Hospital.findById(hospitalId);

    if (!hospital) {
        return res.status(404).json({ error: "Hospital not found" });
    }

    const ward = hospital.wards.id(req.params.id);

    if (!ward) {
        return res.status(404).json({ error: "Ward not found" });
    }

    const fields = ['name', 'type', 'capacity', 'currentOccupancy', 'isActive'];
    fields.forEach((field) => {
        if (req.body[field] !== undefined) {
            ward[field] = req.body[field];
        }
    });

    await hospital.save();
    res.json({ data: ward });
});

/**
 * Delete a ward
 */
const deleteWard = asyncHandler(async (req, res) => {
    const hospitalId = req.user?.hospitalId;

    if (!hospitalId) {
        return res.status(400).json({ error: "Hospital ID is required" });
    }

    const hospital = await Hospital.findById(hospitalId);

    if (!hospital) {
        return res.status(404).json({ error: "Hospital not found" });
    }

    const ward = hospital.wards.id(req.params.id);

    if (!ward) {
        return res.status(404).json({ error: "Ward not found" });
    }

    ward.deleteOne();
    await hospital.save();

    res.json({ data: { message: "Ward deleted successfully" } });
});

/**
 * Update ward occupancy (increment/decrement)
 */
const updateOccupancy = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { increment } = req.body;
    const hospitalId = req.user?.hospitalId;

    if (!hospitalId) {
        return res.status(400).json({ error: "Hospital ID is required" });
    }

    const hospital = await Hospital.findById(hospitalId);

    if (!hospital) {
        return res.status(404).json({ error: "Hospital not found" });
    }

    const ward = hospital.wards.id(id);

    if (!ward) {
        return res.status(404).json({ error: "Ward not found" });
    }

    if (increment) {
        if (ward.currentOccupancy >= ward.capacity) {
            return res.status(400).json({ error: "Ward is at full capacity" });
        }
        ward.currentOccupancy += 1;
    } else {
        if (ward.currentOccupancy <= 0) {
            return res.status(400).json({ error: "Ward occupancy cannot be negative" });
        }
        ward.currentOccupancy -= 1;
    }

    await hospital.save();
    res.json({ data: ward });
});

module.exports = {
    createWard: [createValidators, validate, createWard],
    getWards: [validate, getWards],
    getWard: [idParam, validate, getWard],
    updateWard: [updateValidators, validate, updateWard],
    deleteWard: [idParam, validate, deleteWard],
    updateOccupancy: [
        param("id").isMongoId(),
        body("increment").isBoolean(),
        validate,
        updateOccupancy
    ],
};
