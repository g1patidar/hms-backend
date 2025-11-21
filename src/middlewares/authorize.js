/**
 * Authorization middleware
 * - Checks whether the authenticated user has required permissions
 * - Options: { requireAll: boolean }
 */
const { getUserPermissions, hasRequiredPermissions } = require('../services/permissionService');

function authorize(required = [], options = {}) {
	const { requireAll = false } = options;
	return async function authorizeMiddleware(req, res, next) {
		try {
			if (!req.user) {
				return res.status(401).json({ error: 'Unauthorized' });
			}
			const userPerms = await getUserPermissions(req.user, req);
			const allowed = hasRequiredPermissions(userPerms, required, requireAll);
			if (!allowed) {
				return res.status(403).json({ error: 'Forbidden' });
			}
			return next();
		} catch (err) {
			return res.status(500).json({ error: 'Authorization error' });
		}
	};
}

module.exports = authorize;


