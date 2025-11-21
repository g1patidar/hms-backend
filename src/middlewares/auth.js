/**
 * Auth middleware
 * - Validates JWT access token
 * - Loads user from DB and attaches to req.user
 */
const { verifyAccessToken } = require('../utils/jwt');
const { User } = require('../models');

async function auth(req, res, next) {
	try {
		const header = req.headers.authorization || '';
		const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
		const cookieToken = req.cookies && req.cookies.accessToken ? req.cookies.accessToken : null;
		const token = bearer || cookieToken;
		if (!token) {
			return res.status(401).json({ error: 'Unauthorized' });
		}
		const payload = verifyAccessToken(token);
		const user = await User.findById(payload.sub).lean();
		if (!user || user.isActive === false) {
			return res.status(401).json({ error: 'Unauthorized' });
		}
		req.user = {
			_id: user._id,
			role: user.role,
			hospitalId: user.hospitalId || null,
			email: user.email,
			name: user.name,
		};
		return next();
	} catch (err) {
		return res.status(401).json({ error: 'Unauthorized' });
	}
}

module.exports = auth;


