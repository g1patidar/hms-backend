/**
 * Hospital controller
 * - Create hospital (admin or super_admin via permissions)
 */
const { body } = require("express-validator");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middlewares/validate");
const { Hospital } = require("../models");

const createHospitalValidators = [
  body("name").isString().isLength({ min: 2 }),
  body("address").optional().isString(),
  body("metadata").optional(),
];

const createHospital = asyncHandler(async (req, res) => {
  const { name, address, metadata } = req.body;
  const hospital = new Hospital({
    name: String(name).trim(),
    address: typeof address === "string" ? address : undefined,
    metadata: metadata !== undefined ? metadata : undefined,
  });
  await hospital.save();
  res.status(201).json({
    data: {
      _id: hospital._id,
      name: hospital.name,
      address: hospital.address || "",
      metadata: hospital.metadata || null,
      createdAt: hospital.createdAt,
    },
  });
});

const getHospital = asyncHandler(async (req, res) => {
  const hospitalId = req.user?.hospitalId;
  if (!hospitalId) {
    return res.status(404).json({ error: "No hospital associated with this user" });
  }
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    return res.status(404).json({ error: "Hospital not found" });
  }
  res.json({
    data: {
      _id: hospital._id,
      name: hospital.name,
      address: hospital.address || "",
      metadata: hospital.metadata || null,
      createdAt: hospital.createdAt,
    },
  });
});

const updateHospitalValidators = [
  body("name").optional().isString().isLength({ min: 2 }),
  body("address").optional().isString(),
  body("metadata").optional(),
];

const updateHospital = asyncHandler(async (req, res) => {
  const hospitalId = req.user?.hospitalId;
  if (!hospitalId) {
    return res.status(404).json({ error: "No hospital associated with this user" });
  }
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    return res.status(404).json({ error: "Hospital not found" });
  }

  const { name, address, metadata } = req.body;
  if (name !== undefined) hospital.name = String(name).trim();
  if (address !== undefined) hospital.address = address;
  if (metadata !== undefined) hospital.metadata = metadata;

  await hospital.save();

  res.json({
    data: {
      _id: hospital._id,
      name: hospital.name,
      address: hospital.address || "",
      metadata: hospital.metadata || null,
      createdAt: hospital.createdAt,
    },
  });
});

module.exports = {
  createHospital: [createHospitalValidators, validate, createHospital],
  getHospital: [validate, getHospital],
  updateHospital: [updateHospitalValidators, validate, updateHospital],
};
