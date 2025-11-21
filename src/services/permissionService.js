/**
 * Permission service
 * - Resolves permissions for a user from Role or default mapping
 * - Caches results per-request using req.context.permissionCache
 */
const { Role } = require('../models');

const DEFAULT_ROLE_PERMISSIONS = {
	super_admin: ['*'],
	admin: [
		'create_patient',
		'read_patient',
		'update_patient',
		'delete_patient',
		'create_encounter',
		'read_encounter',
		'update_encounter',
		'delete_encounter',
		'view_audit',
		'schedule_deletion',
		'manage_users',
		'manage_settings',
	],
	staff: [
		'create_patient',
		'read_patient',
		'update_patient',
		'create_encounter',
		'read_encounter',
		'update_encounter',
	],
	user: [
		'read_patient',
		'read_encounter',
	],
};

async function getUserPermissions(user, req) {
	const cacheKey = `permissions:${String(user._id)}`;
	if (req?.context?.permissionCache?.has(cacheKey)) {
		return req.context.permissionCache.get(cacheKey);
	}
	let permissions = [];
	if (user.role === 'super_admin') {
		permissions = ['*'];
	}
	if (!permissions.length) {
		permissions = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
	}
	if (req?.context?.permissionCache) {
		req.context.permissionCache.set(cacheKey, permissions);
	}
	return permissions;
}

function hasRequiredPermissions(userPerms, required, requireAll = false) {
	if (!required || required.length === 0) return true;
	if (userPerms.includes('*')) return true;
	const set = new Set(userPerms);
	if (requireAll) {
		return required.every((p) => set.has(p));
	}
	return required.some((p) => set.has(p));
}

module.exports = {
	getUserPermissions,
	hasRequiredPermissions,
	DEFAULT_ROLE_PERMISSIONS,
};


