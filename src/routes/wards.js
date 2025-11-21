/**
 * Ward routes
 * Endpoints for ward management
 */
const express = require('express');
const router = express.Router();
const wardController = require('../controllers/wardController');
const auth = require('../middlewares/auth');

// All ward routes require authentication
router.use(auth);

// CRUD operations
router.post('/', wardController.createWard);
router.get('/', wardController.getWards);
router.get('/:id', wardController.getWard);
router.put('/:id', wardController.updateWard);
router.delete('/:id', wardController.deleteWard);

// Special endpoint for updating occupancy
router.patch('/:id/occupancy', wardController.updateOccupancy);

module.exports = router;
