/**
 * Patient controller
 * Implements create, read with latest encounters summary, update, soft-delete with schedule, restore, and custom schedule.
 */
const { body, param, query } = require("express-validator");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middlewares/validate");
const { Patient, Encounter } = require("../models");
const { default: mongoose } = require("mongoose");

const createValidators = [
  body("hospitalId").isMongoId(),
  body("firstName").isString().isLength({ min: 1 }),
  body("lastName").isString().isLength({ min: 1 }),
  body("dateOfBirth").optional().isISO8601(),
  body("gender").optional().isIn(["male", "female", "other", "unknown"]),
  body("contact").optional().isObject(),
];

const idParam = [param("id").isMongoId()];

const updateValidators = [
  param("id").isMongoId(),
  body("firstName").optional().isString().isLength({ min: 1 }),
  body("lastName").optional().isString().isLength({ min: 1 }),
  body("dateOfBirth").optional().isISO8601(),
  body("gender").optional().isIn(["male", "female", "other", "unknown"]),
  body("contact").optional().isObject(),
];

const getValidators = [
  param("id").isMongoId(),
  query("latestEncounters").optional().isInt({ min: 0, max: 20 }),
];

const createPatient = asyncHandler(async (req, res) => {
  const payload = {
    hospitalId: req.body.hospitalId,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    dateOfBirth: req.body.dateOfBirth
      ? new Date(req.body.dateOfBirth)
      : undefined,
    gender: req.body.gender,
    contact: req.body.contact || {},
  };
  const patient = await Patient.create(payload);
  res.status(201).json({ data: patient });
});

const getPatients = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page || "1", 10);
  const limit = parseInt(req.query.limit || "10", 10);
  const search = req.query.search || "";
  const skip = (page - 1) * limit;

  const query = {};
  if (req.user?.hospitalId) {
    query.hospitalId = new mongoose.Types.ObjectId(req.user.hospitalId);
  }

  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
    ];
  }

  const [patients, total] = await Promise.all([
    Patient.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Patient.countDocuments(query),
  ]);

  res.json({
    data: patients,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

const getPatient = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.latestEncounters || "3", 10);
  const patient = await Patient.findById(req.params.id).lean();
  if (!patient) return res.status(404).json({ error: "Patient not found" });
  const encounters = await Encounter.find({
    patientId: patient._id,
    isDeleted: { $ne: true },
  })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
  res.json({
    data: {
      patient,
      latestEncounters: encounters.map((e) => ({
        _id: e._id,
        timestamp: e.timestamp,
        notes: e.notes,
      })),
    },
  });
});

const updatePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) return res.status(404).json({ error: "Patient not found" });
  const fields = [
    "firstName",
    "lastName",
    "gender",
    "contact",
    "assignedDoctor",
    "admissionType",
    "ward",
    "bedNumber",
  ];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) patient[f] = req.body[f];
  });
  if (req.body.dateOfBirth !== undefined) {
    patient.dateOfBirth = req.body.dateOfBirth
      ? new Date(req.body.dateOfBirth)
      : null;
  }
  await patient.save();
  res.json({ data: patient });
});

const dischargePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) return res.status(404).json({ error: "Patient not found" });

  // Create discharge encounter
  await Encounter.create({
    patientId: patient._id,
    hospitalId: patient.hospitalId,
    type: "Discharge",
    notes: "Patient discharged from hospital.",
    timestamp: new Date(),
  });

  // Clear admission details
  patient.assignedDoctor = undefined;
  patient.admissionType = undefined;
  patient.ward = undefined;
  patient.bedNumber = undefined;

  await patient.save();
  res.json({ data: patient });
});

const deletePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) return res.status(404).json({ error: "Patient not found" });
  await patient.deleteOne();
  res.json({ data: { message: "Patient deleted successfully" } });
});

const scheduleDeleteValidators = [
  param("id").isMongoId(),
  body("date").isISO8601(), // custom schedule date
  body("dryRun").optional().isBoolean(),
];

const admitValidators = [
  param("id").isMongoId(),
  body("assignedDoctor").isString().isLength({ min: 1 }),
  body("ward").isString().isLength({ min: 1 }),
  body("bedNumber").isString().isLength({ min: 1 }),
  body("admissionType").optional().isString(),
];

const admitPatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) return res.status(404).json({ error: "Patient not found" });

  patient.assignedDoctor = req.body.assignedDoctor;
  patient.admissionType = req.body.admissionType;
  patient.ward = req.body.ward;
  patient.bedNumber = req.body.bedNumber;

  await patient.save();

  // Create admission encounter
  await Encounter.create({
    patientId: patient._id,
    hospitalId: patient.hospitalId,
    type: "Admission",
    notes: `Admitted by ${req.body.assignedDoctor}${
      req.body.admissionType ? ` (${req.body.admissionType})` : ""
    } to ${req.body.ward}, bed ${req.body.bedNumber}.`,
    timestamp: new Date(),
  });

  res.json({ data: patient });
});

module.exports = {
  createPatient: [createValidators, validate, createPatient],
  getPatients: [validate, getPatients],
  getPatient: [getValidators, validate, getPatient],
  updatePatient: [updateValidators, validate, updatePatient],
  admitPatient: [admitValidators, validate, admitPatient],
  dischargePatient: [idParam, validate, dischargePatient],
  deletePatient: [idParam, validate, deletePatient],
};
