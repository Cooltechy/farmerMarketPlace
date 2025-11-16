const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Search products with enhanced filtering and sorting
const searchProducts = async (req, res) => {
    try {
        const { q, category, location, minPrice, maxPrice, organic, sort } = req.query;
        
        let filter = { isAvailable: true };
        
        // Text search across multiple fields
        if (q && q.trim()) {
            filter.$or = [
                { name: new RegExp(q.trim(), 'i') },
                { description: new RegExp(q.trim(), 'i') },
                { farmerName: new RegExp(q.trim(), 'i') },
                { category: new RegExp(q.trim(), 'i') }
            ];
        }
        
        // Category filter
        if (category && category !== 'all' && category !== '') {
            filter.category = category;
        }
        

        
        // Price range filter
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice && !isNaN(parseFloat(minPrice))) {
                filter.price.$gte = parseFloat(minPrice);
            }
            if (maxPrice && !isNaN(parseFloat(maxPrice))) {
                filter.price.$lte = parseFloat(maxPrice);
            }
        }

        // Organic filter
        if (organic === 'true') {
            filter.isOrganic = true;
        } else if (organic === 'false') {
            filter.isOrganic = false;
        }

        // Build sort options
        let sortOptions = { createdAt: -1 }; // default: newest first
        
        switch (sort) {
            case 'oldest':
                sortOptions = { createdAt: 1 };
                break;
            case 'price-low':
                sortOptions = { price: 1 };
                break;
            case 'price-high':
                sortOptions = { price: -1 };
                break;
            case 'name':
                sortOptions = { name: 1 };
                break;
            case 'newest':
            default:
                sortOptions = { createdAt: -1 };
                break;
        }

        const products = await Product.find(filter)
            .populate('farmerId', 'name contact')
            .sort(sortOptions)
            .limit(50); // Limit results for performance

        res.json({
            success: true,
            products,
            count: products.length,
            filters: {
                query: q,
                category,
                minPrice,
                maxPrice,
                organic,
                sort
            }
        });

    } catch (error) {
        console.error('Error searching products:', error);
        res.status(500).json({ success: false, message: 'Search failed', error: error.message });
    }
};

// Search suggestions for autocomplete
const getSearchSuggestions = async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.trim().length < 2) {
            return res.json({ success: true, suggestions: [] });
        }

        const query = q.trim();
        const suggestions = [];

        // Get product name suggestions
        const productSuggestions = await Product.aggregate([
            {
                $match: {
                    isAvailable: true,
                    name: new RegExp(query, 'i')
                }
            },
            {
                $group: {
                    _id: '$name',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 3 }
        ]);

        productSuggestions.forEach(item => {
            suggestions.push({
                text: item._id,
                type: 'product'
            });
        });

        // Get category suggestions
        const categories = ['fruits', 'vegetables', 'grains', 'dairy', 'meat', 'herbs', 'other'];
        const matchingCategories = categories.filter(cat => 
            cat.toLowerCase().includes(query.toLowerCase())
        );

        matchingCategories.forEach(category => {
            suggestions.push({
                text: category,
                type: 'category'
            });
        });



        res.json({
            success: true,
            suggestions: suggestions.slice(0, 8) // Limit to 8 suggestions
        });

    } catch (error) {
        console.error('Error getting suggestions:', error);
        res.json({ success: false, suggestions: [] });
    }
};

// GET - Search page
router.get('/search', async (req, res) => {
    // Require authentication for search functionality
    if (!req.session || !req.session.user) {
        return res.redirect('/login?error=Please log in to search products');
    }
    
    const user = req.session.user;
    
    res.render('search', {
        query: req.query.q || '',
        categories: ['fruits', 'vegetables', 'grains', 'dairy', 'meat', 'herbs', 'other'],
        user
    });
});

// GET - Search API (require authentication)
const { requireAuth } = require('../middleware/auth');
router.get('/api/search', requireAuth, searchProducts);

// GET - Search suggestions API (require authentication)
router.get('/api/suggestions', requireAuth, getSearchSuggestions);

module.exports = router;