const express = require('express');
const router = express.Router();
const {
    showAddProductPage,
    addProduct,
    showFarmerProducts,
    showAllProducts,
    deleteProduct,
    toggleProductAvailability
} = require('../controllers/productController');
const { requireAuth, requireFarmer } = require('../middleware/auth');

// GET - Show add product page (farmer only)
router.get('/add-product', requireAuth, requireFarmer, showAddProductPage);

// POST - Handle add product form submission (farmer only)
router.post('/add-product', requireAuth, requireFarmer, addProduct);

// GET - Show farmer's products (authenticated users only)
router.get('/farmer/:farmerId/products', requireAuth, showFarmerProducts);

// GET - Show all products (browse) - authenticated users only
router.get('/products', requireAuth, showAllProducts);

// DELETE - Delete product (farmer only)
router.delete('/products/:productId', requireAuth, requireFarmer, deleteProduct);

// PUT - Toggle product availability (farmer only)
router.put('/products/:productId/toggle', requireAuth, requireFarmer, toggleProductAvailability);

module.exports = router;