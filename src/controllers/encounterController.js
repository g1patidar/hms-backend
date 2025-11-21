/**
 * Encounter controller
 * Create encounter with patient journey update, list with cursor pagination, delete (soft/hard).
 */
const { body, param, query } = require("express-validator");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middlewares/validate");
const { Encounter, Patient } = require("../models");

const createValidators = [
  param("id").isMongoId(),
  body("notes").optional().isString(),
  body("vitals").optional().isObject(),
  body("meds").optional().isArray(),
  body("files").optional().isArray(),
  body("timestamp").optional().isISO8601(),
];

const createEncounter = asyncHandler(async (req, res) => {
  const patientId = req.params.id;
  const patient = await Patient.findById(patientId);
  if (!patient) return res.status(404).json({ error: "Patient not found" });
  const payload = {
    patientId: patient._id,
    hospitalId: patient.hospitalId,
    authorId: req.user?._id || null,
    notes: req.body.notes,
    vitals: req.body.vitals,
    meds: req.body.meds || [],
    files: req.body.files || [],
    timestamp: req.body.timestamp ? new Date(req.body.timestamp) : new Date(),
  };
  const encounter = await Encounter.create(payload);
  // Update patient journey
  patient.journey.unshift({
    encounterId: encounter._id,
    type: "encounter",
    summary: payload.notes ? String(payload.notes).slice(0, 140) : "Encounter",
    timestamp: payload.timestamp,
  });
  // cap journey length to avoid unbounded growth (keep latest 100)
  if (patient.journey.length > 100) {
    patient.journey = patient.journey.slice(0, 100);
  }
  await patient.save();
  res.status(201).json({ data: encounter });
});

const listValidators = [
  param("id").isMongoId(),
  query("limit").optional().isInt({ min: 1, max: 50 }),
  query("cursor").optional().isString(),
  query("search").optional().isString(),
  query("startDate").optional().isISO8601(),
  query("endDate").optional().isISO8601(),
];

const listEncounters = asyncHandler(async (req, res) => {
  const patientId = req.params.id;
  const limit = parseInt(req.query.limit || "10", 10);
  const cursor = req.query.cursor;
  const search = req.query.search;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  const queryFilter = { patientId, isDeleted: { $ne: true } };

  if (search) {
    queryFilter.notes = { $regex: search, $options: "i" };
  }

  if (startDate || endDate) {
    queryFilter.timestamp = {};
    if (startDate) queryFilter.timestamp.$gte = new Date(startDate);
    if (endDate) queryFilter.timestamp.$lte = new Date(endDate);
  }

  if (cursor) {
    // cursor format: `${timestampMs}_${encounterId}`
    const [tsStr, id] = cursor.split("_");
    const ts = new Date(Number(tsStr));
    queryFilter.$or = [
      { timestamp: { $lt: ts } },
      { timestamp: ts, _id: { $lt: id } },
    ];
  }

  console.log("listEncounters query:", JSON.stringify(queryFilter));

  const items = await Encounter.find(queryFilter)
    .sort({ timestamp: -1, _id: -1 })
    .limit(limit + 1)
    .lean();

  console.log("listEncounters found:", items.length);

  let nextCursor = null;
  if (items.length > limit) {
    const last = items[limit - 1];
    nextCursor = `${new Date(last.timestamp).getTime()}_${last._id}`;
  }
  const data = items.slice(0, limit);
  res.json({ data, nextCursor });
});

const deleteValidators = [
  param("encounterId").isMongoId(),
  query("dryRun").optional().isBoolean(),
];

const deleteEncounter = asyncHandler(async (req, res) => {
  const id = req.params.encounterId;
  const encounter = await Encounter.findById(id);
  if (!encounter) return res.status(404).json({ error: "Encounter not found" });
  const isSuperAdmin = req.user?.role === "super_admin";
  const dryRun = String(req.query.dryRun || "").toLowerCase() === "true";

  if (dryRun) {
    return res.json({
      dryRun: true,
      wouldHardDelete: isSuperAdmin,
      currentlyDeleted: Boolean(encounter.isDeleted),
      encounterId: String(encounter._id),
    });
  }
  if (isSuperAdmin) {
    await encounter.deleteOne();
    return res.json({ success: true, hardDeleted: true });
  }
  if (encounter.isDeleted) {
    return res.json({ success: true, softDeleted: true });
  }
  encounter.isDeleted = true;
  encounter.deletedAt = new Date();
  encounter.deletedBy = req.user?._id || null;
  encounter.deletedReason = req.body?.reason || null;
  await encounter.save();
  res.json({ success: true, softDeleted: true });
});

module.exports = {
  createEncounter: [createValidators, validate, createEncounter],
  listEncounters: [listValidators, validate, listEncounters],
  deleteEncounter: [deleteValidators, validate, deleteEncounter],
};
