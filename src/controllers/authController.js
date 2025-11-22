/**
 * Simple Auth Controller (validators + handlers)
 * Routes: POST /auth/register, /auth/login, /auth/refresh, /auth/logout
 */
const { body } = require("express-validator");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middlewares/validate");
const { User, RefreshToken } = require("../models");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  parseDurationToMs,
} = require("../utils/jwt");
const dayjs = require("dayjs");

const registerValidators = [
  body("name").isString().isLength({ min: 2 }),
  body("email").isEmail(),
  body("password").isString().isLength({ min: 8 }),
  body("hospitalId").optional().isString(),
];

const loginValidators = [
  body("email").isEmail(),
  body("password").isString().isLength({ min: 6 }),
];

// For cookie-based refresh/logout, no body token is required
const refreshValidators = [];

function getCookieBaseOptions() {
  const isProd = process.env.NODE_ENV === "production";
  // Allow overriding cookie attributes via env to support cross-site setups and dev needs
  // COOKIE_SAMESITE: 'lax' | 'strict' | 'none' (default: 'lax')
  // COOKIE_SECURE: 'true' | 'false' (default: NODE_ENV === 'production')
  // COOKIE_DOMAIN: e.g., '.example.com' to share across subdomains (optional)
  const sameSiteEnv = String(process.env.COOKIE_SAMESITE || "").toLowerCase();
  const sameSite =
    sameSiteEnv === "none"
      ? "none"
      : sameSiteEnv === "strict"
        ? "strict"
        : "lax";
  const secureEnv = process.env.COOKIE_SECURE;
  const secure =
    typeof secureEnv === "string" ? secureEnv.toLowerCase() === "true" : isProd;
  const domain = process.env.COOKIE_DOMAIN || undefined;

  return {
    httpOnly: true,
    secure: isProd,
    sameSite,
    path: "/",
    ...(domain ? { domain } : {}),
  };
}

function setAuthCookies(res, tokens) {
  const accessTtlMs =
    parseDurationToMs(process.env.ACCESS_TOKEN_TTL || "15m") || 15 * 60 * 1000;
  const refreshTtlMs =
    parseDurationToMs(process.env.REFRESH_TOKEN_TTL || "7d") ||
    7 * 24 * 60 * 60 * 1000;
  const base = getCookieBaseOptions();
  res.cookie("accessToken", tokens.accessToken, {
    ...base,
    maxAge: accessTtlMs,
  });
  res.cookie("refreshToken", tokens.refreshToken, {
    ...base,
    maxAge: refreshTtlMs,
  });
}

function clearAuthCookies(res) {
  const base = getCookieBaseOptions();
  res.clearCookie("accessToken", base);
  res.clearCookie("refreshToken", base);
}

const registerHandler = asyncHandler(async (req, res) => {
  const { name, email, password, hospitalId } = req.body;
  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) {
    return res.status(409).json({ error: "Email already in use" });
  }
  const user = new User({
    name,
    email: String(email).toLowerCase(),
    role: "user",
    hospitalId: hospitalId || null,
  });
  await user.setPassword(password);
  await user.save();
  res.status(201).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      hospitalId: user.hospitalId || null,
    },
  });
});

const loginHandler = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user || user.isActive === false) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const valid = await user.validatePassword(password);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  setAuthCookies(res, { accessToken, refreshToken });
  res.status(200).json({
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
      hospitalId: user.hospitalId || null,
    },
  });
});

const refreshHandler = asyncHandler(async (req, res) => {
  const refreshToken =
    (req.cookies && req.cookies.refreshToken) || req.body.refreshToken;
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (_e) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  const user = await User.findById(payload.sub);
  if (!user || user.isActive === false) {
    return res.status(401).json({ error: "User not found" });
  }
  const accessToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user);

  setAuthCookies(res, { accessToken, refreshToken: newRefreshToken });
  res.status(200).json({ success: true });
});

const logoutHandler = asyncHandler(async (req, res) => {
  const refreshToken =
    (req.cookies && req.cookies.refreshToken) || req.body.refreshToken;

  clearAuthCookies(res);
  res.status(200).json({ success: true });
});

// Authenticated current user info (requires auth middleware)
const meHandler = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.status(200).json({ user: req.user });
});

const updatePasswordValidators = [
  body("currentPassword").isString().notEmpty(),
  body("newPassword").isString().isLength({ min: 8 }),
];

const updatePasswordHandler = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const valid = await user.validatePassword(currentPassword);
  if (!valid) {
    return res.status(401).json({ error: "Invalid current password" });
  }

  await user.setPassword(newPassword);
  await user.save();

  res.status(200).json({ success: true, message: "Password updated successfully" });
});

const updateMeValidators = [
  body("name").optional().isString().isLength({ min: 2 }),
  body("email").optional().isEmail(),
];

const updateMeHandler = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (name) user.name = name;
  if (email && email !== user.email) {
    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "Email already in use" });
    }
    user.email = String(email).toLowerCase();
  }

  await user.save();

  res.status(200).json({
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      hospitalId: user.hospitalId || null,
    },
  });
});

module.exports = {
  registerValidators,
  loginValidators,
  refreshValidators,
  registerHandler: [registerValidators, validate, registerHandler],
  loginHandler: [loginValidators, validate, loginHandler],
  refreshHandler: [refreshValidators, validate, refreshHandler],
  logoutHandler: [refreshValidators, validate, logoutHandler],
  meHandler,
  updatePasswordHandler: [updatePasswordValidators, validate, updatePasswordHandler],
  updateMeHandler: [updateMeValidators, validate, updateMeHandler],
};
