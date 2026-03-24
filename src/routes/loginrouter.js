const express = require("express");
// Destructuring the controller functions
const { 
  login, 
  logout, 
  forgotPassword, 
  verifyOTP, 
  resetPassword 
} = require("../controllers/webAuthCobntroller.js");

const router = express.Router();

router.post("/login", login);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);

// Standard CommonJS export
module.exports = router;