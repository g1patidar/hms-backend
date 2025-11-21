/**
 * User controller
 * Super-admin and admin management endpoints (guarded by permissions).
 */
const { body, param } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middlewares/validate');
const { User } = require('../models');

const createUserValidators = [
	body('name').isString().isLength({ min: 2 }),
	body('email').isEmail(),
	body('password').isString().isLength({ min: 8 }),
	body('role').isIn(['super_admin', 'admin', 'user']).optional().default('user'),
	body('hospitalId').optional().isString(),
];

const updateUserValidators = [
	param('id').isMongoId(),
	body('name').optional().isString().isLength({ min: 2 }),
	body('email').optional().isEmail(),
	body('password').optional().isString().isLength({ min: 8 }),
	body('role').optional().isIn(['super_admin', 'admin', 'user']),
	body('hospitalId').optional().isString(),
];

const idParam = [param('id').isMongoId()];

const listUsers = asyncHandler(async (req, res) => {
	const users = await User.find().select('-passwordHash').lean();
	res.json({ data: users });
});

const getUser = asyncHandler(async (req, res) => {
	const user = await User.findById(req.params.id).select('-passwordHash').lean();
	if (!user) return res.status(404).json({ error: 'User not found' });
	res.json({ data: user });
});

const createUser = asyncHandler(async (req, res) => {
	const { name, email, password, role, hospitalId } = req.body;
	// Only super_admin can create admin/super_admin
	if (['admin', 'super_admin'].includes(role) && req.user.role !== 'super_admin') {
		return res.status(403).json({ error: 'Forbidden' });
	}
	const user = new User({ name, email: String(email).toLowerCase(), role, hospitalId: hospitalId || null });
	await user.setPassword(password);
	await user.save();
	res.status(201).json({ data: { _id: user._id, name: user.name, email: user.email, role: user.role } });
});

const updateUser = asyncHandler(async (req, res) => {
	const { name, email, password, role, hospitalId } = req.body;
	const user = await User.findById(req.params.id);
	if (!user) return res.status(404).json({ error: 'User not found' });
	if (name) user.name = name;
	if (email) user.email = String(email).toLowerCase();
	if (typeof role === 'string') {
		if (['admin', 'super_admin'].includes(role) && req.user.role !== 'super_admin') {
			return res.status(403).json({ error: 'Forbidden' });
		}
		user.role = role;
	}
	if (hospitalId !== undefined) {
		user.hospitalId = hospitalId || null;
	}
	if (password) {
		await user.setPassword(password);
	}
	await user.save();
	res.json({ data: { _id: user._id, name: user.name, email: user.email, role: user.role } });
});

const deleteUser = asyncHandler(async (req, res) => {
	const user = await User.findById(req.params.id);
	if (!user) return res.status(404).json({ error: 'User not found' });
	await user.deleteOne();
	res.json({ success: true });
});

module.exports = {
	listUsers,
	getUser: [idParam, validate, getUser],
	createUser: [createUserValidators, validate, createUser],
	updateUser: [updateUserValidators, validate, updateUser],
	deleteUser: [idParam, validate, deleteUser],
};


