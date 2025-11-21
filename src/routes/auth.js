const express = require("express");
const router = express.Router();
const {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  meHandler,
  updatePasswordHandler,
  updateMeHandler,
} = require("../controllers/authController");
const auth = require("../middlewares/auth");

router.post("/register", registerHandler);
router.post("/login", loginHandler);
router.post("/refresh", refreshHandler);
router.post("/logout", logoutHandler);
router.get("/me", auth, meHandler);
router.put("/me", auth, updateMeHandler);
router.post("/change-password", auth, updatePasswordHandler);

module.exports = router;
