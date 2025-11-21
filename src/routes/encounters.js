const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");
const ctrl = require("../controllers/encounterController");

router.use(auth);

router.post(
  "/patients/:id",
  authorize(["create_encounter"]),
  ctrl.createEncounter
);
router.get(
  "/patients/:id/encounters",
  authorize(["read_encounter"]),
  ctrl.listEncounters
);
router.delete(
  "/:encounterId",
  authorize(["delete_encounter"]),
  ctrl.deleteEncounter
);

module.exports = router;
