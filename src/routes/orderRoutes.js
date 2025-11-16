const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { requireAuth, requireClient, requireFarmer } = require('../middleware/auth');

// Order management routes - all require authentication
router.get('/history', requireAuth, requireClient, orderController.getBuyerOrderHistory);
router.get('/farmer-orders', requireAuth, requireFarmer, orderController.getFarmerOrderHistory);
router.get('/:orderId', requireAuth, orderController.getOrderDetails);
router.post('/:orderId/cancel', requireAuth, orderController.cancelOrder);
router.post('/place', requireAuth, orderController.placeOrder);
router.put('/:orderId/status', requireAuth, orderController.updateOrderStatus);

module.exports = router;