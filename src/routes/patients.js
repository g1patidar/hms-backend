const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");
const ctrl = require("../controllers/patientController");
const encounterCtrl = require("../controllers/encounterController");

router.use(auth);

router.get("/", authorize(["read_patient"]), ctrl.getPatients);
router.post("/", authorize(["create_patient"]), ctrl.createPatient);
router.get("/:id", authorize(["read_patient"]), ctrl.getPatient);
router.put("/:id", authorize(["update_patient"]), ctrl.updatePatient);
router.post("/:id/admit", authorize(["update_patient"]), ctrl.admitPatient);
router.post(
  "/:id/discharge",
  authorize(["update_patient"]),
  ctrl.dischargePatient
);
router.delete("/:id", authorize(["schedule_deletion"]), ctrl.deletePatient);

// Patient-scoped encounter routes (aliases for convenience)
router.get(
  "/:id/encounters",
  authorize(["read_encounter"]),
  encounterCtrl.listEncounters
);
router.post(
  "/:id/encounters",
  authorize(["create_encounter"]),
  encounterCtrl.createEncounter
);

module.exports = router;
