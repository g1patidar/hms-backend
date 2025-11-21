/**
 * User model
 * Fields: name, email, passwordHash, role (string), roleRef (Role), hospitalId
 * Includes helpers to set/verify password with bcrypt.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

const UserSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		email: { type: String, required: true, unique: true, lowercase: true, index: true },
		passwordHash: { type: String, required: true },
		role: { type: String, required: true, enum: ['super_admin', 'admin', 'user', 'staff'], index: true, default: 'user' },
		hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true, default: null },
		isActive: { type: Boolean, default: true },
	},
	{ timestamps: true }
);

UserSchema.index({ createdAt: 1 });

UserSchema.methods.setPassword = async function setPassword(plain) {
	const salt = await bcrypt.genSalt(SALT_ROUNDS);
	this.passwordHash = await bcrypt.hash(plain, salt);
};

UserSchema.methods.validatePassword = async function validatePassword(plain) {
	return bcrypt.compare(plain, this.passwordHash);
};

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);


