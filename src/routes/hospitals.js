const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");
const ctrl = require("../controllers/hospitalController");

router.use(auth);

// Create hospital (admin or super_admin via 'manage_settings' or '*')
router.post("/", authorize(["manage_settings"]), ctrl.createHospital);

// Get current hospital details
router.get("/", ctrl.getHospital);

// Update hospital details
router.put("/", authorize(["manage_settings"]), ctrl.updateHospital);

module.exports = router;
