const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const ctrl = require('../controllers/userController');

router.use(auth);

router.get('/', authorize(['manage_users']), ctrl.listUsers);
router.get('/:id', authorize(['manage_users']), ctrl.getUser);
router.post('/', authorize(['manage_users']), ctrl.createUser);
router.put('/:id', authorize(['manage_users']), ctrl.updateUser);
router.delete('/:id', authorize(['manage_users']), ctrl.deleteUser);

module.exports = router;


