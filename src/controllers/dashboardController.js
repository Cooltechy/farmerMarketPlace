// Show farmer dashboard
const showFarmerDashboard = async (req, res) => {
    try {
        // Get user from session
        if (!req.session || !req.session.user) {
            return res.redirect('/login?error=Please log in to access farmer dashboard');
        }
        
        const user = req.session.user;
        
        // Verify user is a farmer
        if (user.userType !== 'farmer') {
            return res.redirect('/login?error=Farmer access required');
        }

        const Order = require('../models/Order');
        const Product = require('../models/Product');
        const mongoose = require('mongoose');
        const userId = user._id.toString();

        // Get farmer's products statistics
        const productStats = await Product.aggregate([
            { $match: {
                $or: [
                    { farmerId: userId },
                    { farmerId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null }
                ]
            } },
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    availableProducts: {
                        $sum: { $cond: [{ $eq: ['$isAvailable', true] }, 1, 0] }
                    },
                    organicProducts: {
                        $sum: { $cond: [{ $eq: ['$isOrganic', true] }, 1, 0] }
                    },
                    totalQuantity: { $sum: '$quantity' },
                    averagePrice: { $avg: '$price' }
                }
            }
        ]);

        // Get order statistics for the farmer (orders received)
        const orderStats = await Order.aggregate([
            { $match: {
                $or: [
                    { farmerId: userId },
                    { farmerId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null }
                ]
            } },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: '$totalAmount' },
                    pendingOrders: {
                        $sum: {
                            $cond: [
                                { $in: ['$status', ['pending', 'confirmed']] },
                                1,
                                0
                            ]
                        }
                    },
                    completedOrders: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0]
                        }
                    },
                    averageOrderValue: { $avg: '$totalAmount' }
                }
            }
        ]);



        // Get recent orders (last 5 orders received)
        const recentOrders = await Order.find({
            $or: [
                { farmerId: userId },
                { farmerId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null }
            ]
        })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('productId', 'name category')
            .populate('buyerId', 'name contact');

        // Get category breakdown of farmer's products
        const categoryStats = await Product.aggregate([
            { $match: {
                $or: [
                    { farmerId: userId },
                    { farmerId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null }
                ]
            } },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    totalQuantity: { $sum: '$quantity' },
                    averagePrice: { $avg: '$price' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Get monthly revenue for chart
        const monthlyRevenue = await Order.aggregate([
            { $match: {
                $and: [
                    { $or: [
                        { farmerId: userId },
                        { farmerId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null }
                    ]},
                    { status: 'delivered' }
                ]
            } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    revenue: { $sum: '$totalAmount' },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 6 }
        ]);

        // Get top-selling products
        const topProducts = await Order.aggregate([
            { $match: {
                $or: [
                    { farmerId: userId },
                    { farmerId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null }
                ]
            } },
            {
                $group: {
                    _id: '$productId',
                    productName: { $first: '$productName' },
                    totalQuantitySold: { $sum: '$quantity' },
                    totalRevenue: { $sum: '$totalAmount' },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 5 }
        ]);

        const finalOrderStats = orderStats[0] || {
            totalOrders: 0,
            totalRevenue: 0,
            pendingOrders: 0,
            completedOrders: 0,
            averageOrderValue: 0
        };
        


        res.render('farmer-dashboard', { 
            user,
            productStats: productStats[0] || {
                totalProducts: 0,
                availableProducts: 0,
                organicProducts: 0,
                totalQuantity: 0,
                averagePrice: 0
            },
            orderStats: finalOrderStats,
            recentOrders,
            categoryStats,
            monthlyRevenue,
            topProducts
        });
    } catch (error) {
        console.error('Error loading farmer dashboard:', error);
        // Fallback to basic dashboard if there's an error
        const user = req.user || {
            _id: '507f1f77bcf86cd799439011',
            name: 'Farmer User',
            email: 'farmer@example.com',
            userType: 'farmer',
            contact: '1234567890'
        };
        res.render('farmer-dashboard', { 
            user,
            productStats: {
                totalProducts: 0,
                availableProducts: 0,
                organicProducts: 0,
                totalQuantity: 0,
                averagePrice: 0
            },
            orderStats: {
                totalOrders: 0,
                totalRevenue: 0,
                pendingOrders: 0,
                completedOrders: 0,
                averageOrderValue: 0
            },
            recentOrders: [],
            categoryStats: [],
            monthlyRevenue: [],
            topProducts: []
        });
    }
};

// Show client dashboard - enhanced with product search and recommendations
const showClientDashboard = async (req, res) => {
    try {
        // Get user from session
        if (!req.session || !req.session.user) {
            return res.redirect('/login?error=Please log in to access client dashboard');
        }
        
        const user = req.session.user;
        
        // Verify user is a client
        if (user.userType !== 'client') {
            return res.redirect('/login?error=Client access required');
        }

        const Order = require('../models/Order');
        const Product = require('../models/Product');

        // Get order statistics for the buyer  
        // Handle both string and ObjectId formats for buyerId
        const mongoose = require('mongoose');
        const userId = user._id.toString();
        
        const orderStats = await Order.aggregate([
            { $match: { 
                $or: [
                    { buyerId: userId },
                    { buyerId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null }
                ]
            } },
            {
                $group: {
                    _id: null,
                    totalSpent: { $sum: '$totalAmount' },
                    totalOrders: { $sum: 1 },
                    pendingOrders: {
                        $sum: {
                            $cond: [
                                { $in: ['$status', ['pending', 'confirmed']] },
                                1,
                                0
                            ]
                        }
                    },
                    deliveredOrders: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0]
                        }
                    },
                    inTransitOrders: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'in-transit'] }, 1, 0]
                        }
                    },
                    cancelledOrders: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0]
                        }
                    },
                    averageOrder: { $avg: '$totalAmount' }
                }
            }
        ]);



        // Get recent orders (last 5)
        const recentOrders = await Order.find({ 
            $or: [
                { buyerId: userId },
                { buyerId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null }
            ]
        })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('productId', 'name category');

        // Get featured products (latest 6 available products)
        const featuredProducts = await Product.find({ isAvailable: true })
            .sort({ createdAt: -1 })
            .limit(6)
            .populate('farmerId', 'name contact');

        // Get category statistics for quick categories
        const categoryStats = await Product.aggregate([
            { $match: { isAvailable: true } },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 6 }
        ]);

        // Get monthly spending for chart
        const monthlySpending = await Order.aggregate([
            { $match: { buyerId: user._id, status: 'delivered' } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    totalSpent: { $sum: '$totalAmount' },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 6 }
        ]);

        res.render('client-dashboard', { 
            user, 
            orderStats: orderStats[0] || {
                totalSpent: 0,
                totalOrders: 0,
                pendingOrders: 0,
                deliveredOrders: 0,
                averageOrder: 0
            },
            recentOrders,
            featuredProducts,
            categoryStats,
            monthlySpending
        });
    } catch (error) {
        console.error('Error loading client dashboard:', error);
        // Fallback to basic dashboard if there's an error
        let user = req.user;
        
        if (!user && req.query.userId) {
            try {
                const User = require('../models/User');
                user = await User.findById(req.query.userId);
            } catch (userError) {
                console.error('Error fetching user in fallback:', userError);
            }
        }
        
        if (!user) {
            user = {
                _id: '507f1f77bcf86cd799439012',
                name: 'Client User',
                email: 'client@example.com',
                userType: 'client',
                contact: '0987654321'
            };
        }
        res.render('client-dashboard', { 
            user, 
            orderStats: {
                totalSpent: 0,
                totalOrders: 0,
                pendingOrders: 0,
                deliveredOrders: 0,
                averageOrder: 0
            },
            recentOrders: [],
            featuredProducts: [],
            categoryStats: [],
            monthlySpending: []
        });
    }
};

module.exports = {
    showFarmerDashboard,
    showClientDashboard
};