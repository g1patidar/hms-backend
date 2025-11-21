/**
 * JWT utilities
 * - Sign/verify access and refresh tokens
 * - Small duration parser for env TTLs (e.g., 15m, 7d)
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');

function parseDurationToMs(value) {
	if (!value) return 0;
	const match = /^(\d+)([smhd])$/.exec(String(value).trim());
	if (!match) {
		// fallback: assume milliseconds number
		const asNumber = Number(value);
		return Number.isFinite(asNumber) ? asNumber : 0;
	}
	const amount = parseInt(match[1], 10);
	const unit = match[2];
	const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
	return amount * multipliers[unit];
}

function signAccessToken(user) {
	const secret = process.env.JWT_ACCESS_SECRET;
	const expiresIn = process.env.ACCESS_TOKEN_TTL || '15m';
	const payload = {
		sub: String(user._id),
		role: user.role,
		hospitalId: user.hospitalId ? String(user.hospitalId) : null,
	};
	const token = jwt.sign(payload, secret, { expiresIn });
	return token;
}

function signRefreshToken(user) {
	const secret = process.env.JWT_REFRESH_SECRET;
	const expiresIn = process.env.REFRESH_TOKEN_TTL || '7d';
	const payload = {
		sub: String(user._id),
		type: 'refresh',
	};
	const token = jwt.sign(payload, secret, { expiresIn });
	return token;
}

function verifyAccessToken(token) {
	const secret = process.env.JWT_ACCESS_SECRET;
	return jwt.verify(token, secret);
}

function verifyRefreshToken(token) {
	const secret = process.env.JWT_REFRESH_SECRET;
	return jwt.verify(token, secret);
}

module.exports = {
	parseDurationToMs,
	signAccessToken,
	signRefreshToken,
	verifyAccessToken,
	verifyRefreshToken,
};


