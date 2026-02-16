const Product = require("../models/Product");
const Sale = require("../models/Sale");

exports.sellProduct = async (req, res) => {
    try {
        const { productId, quantitySold, customSellingPrice } = req.body;

        // Validate inputs
        if (!productId || !quantitySold) {
            return res.status(400).json({ 
                message: "Product ID and quantity are required" 
            });
        }

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        if (product.quantity < quantitySold) {
            return res.status(400).json({ 
                message: `Not enough stock. Available: ${product.quantity}` 
            });
        }

        // Determine selling price (custom or regular selling price)
        const sellingPrice = customSellingPrice || product.sellingRate;
        const purchasePrice = product.purchaseRate;
        const wasCustomPrice = customSellingPrice ? true : false;
        
        const totalSaleValue = sellingPrice * quantitySold;
        const totalPurchaseValue = purchasePrice * quantitySold;
        const profit = totalSaleValue - totalPurchaseValue;

        // Update product quantity
        product.quantity -= quantitySold;
        await product.save();

        // Create sale record with custom price info
        const sale = new Sale({
            productId,
            quantitySold,
            sellingPriceAtTime: sellingPrice,
            purchasePriceAtTime: purchasePrice,
            customSellingPrice: customSellingPrice || null,
            wasCustomPrice,
            totalSaleValue,
            totalPurchaseValue,
            profit,
            gstApplied: product.gst || 0
        });

        await sale.save();

        // Populate product details for response
        await sale.populate('productId', 'name barcode sellingRate purchaseRate');

        res.json({ 
            success: true,
            message: "Sale Completed Successfully", 
            sale: {
                ...sale.toObject(),
                usedCustomPrice: wasCustomPrice,
                sellingPrice: product.sellingRate
            },
            remainingStock: product.quantity
        });

    } catch (error) {
        console.error("SELL ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// ================= GET SUMMARY =================
exports.getSummary = async (req, res) => {
    try {
        const sales = await Sale.find()
            .populate('productId', 'name barcode sellingRate purchaseRate')
            .sort({ createdAt: -1 });

        const totalSale = sales.reduce((acc, s) => acc + s.totalSaleValue, 0);
        const totalPurchase = sales.reduce((acc, s) => acc + s.totalPurchaseValue, 0);
        const totalProfit = sales.reduce((acc, s) => acc + s.profit, 0);

        // Enhanced custom price statistics
        const customPriceSales = sales.filter(s => s.wasCustomPrice);
        const customPriceCount = customPriceSales.length;
        const customPriceTotal = customPriceSales.reduce((acc, s) => acc + s.totalSaleValue, 0);
        
        // Analyze custom price patterns
        let belowSellingPriceCount = 0;
        let aboveSellingPriceCount = 0;
        let equalSellingPriceCount = 0;
        let customPriceDetails = [];

        customPriceSales.forEach(sale => {
            const sellingPrice = sale.productId?.sellingRate || sale.sellingPriceAtTime;
            const customPrice = sale.customSellingPrice || sale.sellingPriceAtTime;
            
            const priceComparison = {
                saleId: sale._id,
                productId: sale.productId?._id,
                productName: sale.productId?.name || 'Unknown',
                sellingPrice: sellingPrice,
                customSellingPrice: customPrice,
                quantitySold: sale.quantitySold,
                totalValue: sale.totalSaleValue,
                difference: customPrice - sellingPrice,
                differencePercent: sellingPrice > 0 ? ((customPrice - sellingPrice) / sellingPrice * 100).toFixed(2) : 0,
                comparison: customPrice < sellingPrice ? 'below' : (customPrice > sellingPrice ? 'above' : 'equal')
            };
            
            customPriceDetails.push(priceComparison);
            
            if (customPrice < sellingPrice) belowSellingPriceCount++;
            else if (customPrice > sellingPrice) aboveSellingPriceCount++;
            else equalSellingPriceCount++;
        });

        // Get sales by date with custom price info
        const salesByDate = {};
        sales.forEach(sale => {
            const date = new Date(sale.createdAt).toLocaleDateString('en-IN');
            if (!salesByDate[date]) {
                salesByDate[date] = {
                    totalSale: 0,
                    totalProfit: 0,
                    count: 0,
                    customPriceCount: 0,
                    customPriceTotal: 0,
                    customPriceBelow: 0,
                    customPriceAbove: 0,
                    customPriceEqual: 0
                };
            }
            salesByDate[date].totalSale += sale.totalSaleValue;
            salesByDate[date].totalProfit += sale.profit;
            salesByDate[date].count += 1;
            
            if (sale.wasCustomPrice) {
                salesByDate[date].customPriceCount += 1;
                salesByDate[date].customPriceTotal += sale.totalSaleValue;
                
                const sellingPrice = sale.productId?.sellingRate || sale.sellingPriceAtTime;
                const customPrice = sale.customSellingPrice || sale.sellingPriceAtTime;
                
                if (customPrice < sellingPrice) salesByDate[date].customPriceBelow += 1;
                else if (customPrice > sellingPrice) salesByDate[date].customPriceAbove += 1;
                else salesByDate[date].customPriceEqual += 1;
            }
        });

        // Enhance recent sales with proper naming
        const recentSales = sales.slice(0, 20).map(sale => {
            const sellingPrice = sale.productId?.sellingRate || sale.sellingPriceAtTime;
            const customPrice = sale.customSellingPrice || sale.sellingPriceAtTime;
            const priceDifference = customPrice - sellingPrice;
            
            return {
                _id: sale._id,
                productId: sale.productId,
                productName: sale.productId?.name || 'Deleted Product',
                productBarcode: sale.productId?.barcode || 'N/A',
                quantitySold: sale.quantitySold,
                sellingPriceAtTime: sale.sellingPriceAtTime,
                sellingPrice: sellingPrice,
                wasCustomPrice: sale.wasCustomPrice,
                customSellingPrice: sale.customSellingPrice,
                priceComparison: sale.wasCustomPrice ? 
                    (customPrice < sellingPrice ? 'below' : (customPrice > sellingPrice ? 'above' : 'equal')) : 'standard',
                priceDifference: priceDifference,
                priceDifferencePercent: sellingPrice > 0 ? (priceDifference / sellingPrice * 100).toFixed(2) : 0,
                totalSaleValue: sale.totalSaleValue,
                totalPurchaseValue: sale.totalPurchaseValue,
                profit: sale.profit,
                profitMargin: sale.totalSaleValue > 0 ? ((sale.profit / sale.totalSaleValue) * 100).toFixed(2) : 0,
                createdAt: sale.createdAt
            };
        });

        res.json({ 
            success: true,
            summary: {
                totalSale: Math.round(totalSale * 100) / 100,
                totalPurchase: Math.round(totalPurchase * 100) / 100,
                totalProfit: Math.round(totalProfit * 100) / 100,
                totalTransactions: sales.length,
                averageProfitMargin: sales.length > 0 ? (totalProfit / totalSale * 100).toFixed(2) : 0
            },
            customPriceStats: {
                count: customPriceCount,
                total: Math.round(customPriceTotal * 100) / 100,
                percentage: sales.length > 0 ? ((customPriceCount / sales.length) * 100).toFixed(2) : 0,
                belowSellingPrice: belowSellingPriceCount,
                aboveSellingPrice: aboveSellingPriceCount,
                equalSellingPrice: equalSellingPriceCount,
                details: customPriceDetails.slice(0, 10)
            },
            salesByDate,
            recentSales
        });

    } catch (error) {
        console.error("SUMMARY ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// ================= GET SALES HISTORY =================
exports.getSalesHistory = async (req, res) => {
    try {
        const { limit, productId, startDate, endDate } = req.query;
        
        let query = {};
        
        // Filter by product if specified
        if (productId) {
            query.productId = productId;
        }
        
        // Filter by date range if specified
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                query.createdAt.$lte = new Date(endDate);
            }
        }

        let salesQuery = Sale.find(query)
            .populate('productId', 'name barcode sellingRate purchaseRate')
            .sort({ createdAt: -1 });

        // Apply limit if specified
        if (limit) {
            salesQuery = salesQuery.limit(parseInt(limit));
        }

        const sales = await salesQuery;

        // Enhance sales with custom price info
        const enhancedSales = sales.map(sale => ({
            _id: sale._id,
            productId: sale.productId,
            productName: sale.productId?.name || 'Deleted Product',
            productBarcode: sale.productId?.barcode || 'N/A',
            quantitySold: sale.quantitySold,
            sellingPriceAtTime: sale.sellingPriceAtTime,
            sellingPrice: sale.productId?.sellingRate || sale.sellingPriceAtTime,
            wasCustomPrice: sale.wasCustomPrice,
            customSellingPrice: sale.customSellingPrice,
            totalSaleValue: sale.totalSaleValue,
            totalPurchaseValue: sale.totalPurchaseValue,
            profit: sale.profit,
            profitMargin: ((sale.profit / sale.totalSaleValue) * 100).toFixed(2),
            createdAt: sale.createdAt,
            updatedAt: sale.updatedAt
        }));

        res.json({
            success: true,
            count: enhancedSales.length,
            sales: enhancedSales
        });

    } catch (error) {
        console.error("GET SALES HISTORY ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// ================= GET SALE BY ID =================
exports.getSaleById = async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id)
            .populate('productId', 'name barcode sellingRate purchaseRate');

        if (!sale) {
            return res.status(404).json({ message: "Sale not found" });
        }

        res.json({
            success: true,
            sale: {
                ...sale.toObject(),
                wasCustomPrice: sale.wasCustomPrice,
                sellingPrice: sale.productId?.sellingRate
            }
        });

    } catch (error) {
        console.error("GET SALE BY ID ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// ================= GET SALES BY PRODUCT =================
exports.getSalesByProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        
        const sales = await Sale.find({ productId })
            .populate('productId', 'name barcode sellingRate purchaseRate')
            .sort({ createdAt: 1 }); // Ascending for chronological order

        // Get product details
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Calculate total purchased quantity
        const totalSoldAll = sales.reduce((acc, s) => acc + s.quantitySold, 0);
        const totalPurchasedQty = product.quantity + totalSoldAll;
        const totalPurchaseValue = totalPurchasedQty * product.purchaseRate;

        // Group sales by price in chronological order
        const salesByPrice = [];
        let currentPrice = null;
        let currentPriceSales = [];
        let currentPriceIsCustom = false;

        // Process each sale in chronological order
        for (const sale of sales) {
            const salePrice = sale.wasCustomPrice ? sale.customSellingPrice : product.sellingRate;
            const isCustom = sale.wasCustomPrice;
            
            if (currentPrice !== salePrice) {
                // Save previous group
                if (currentPriceSales.length > 0) {
                    const groupQty = currentPriceSales.reduce((acc, s) => acc + s.quantitySold, 0);
                    const groupValue = currentPriceSales.reduce((acc, s) => acc + s.totalSaleValue, 0);
                    const groupProfit = currentPriceSales.reduce((acc, s) => acc + s.profit, 0);
                    
                    salesByPrice.push({
                        price: currentPrice,
                        isCustom: currentPriceIsCustom,
                        quantity: groupQty,
                        salesValue: groupValue,
                        profit: groupProfit
                    });
                }
                
                // Start new group
                currentPrice = salePrice;
                currentPriceIsCustom = isCustom;
                currentPriceSales = [sale];
            } else {
                currentPriceSales.push(sale);
            }
        }
        
        // Add last group
        if (currentPriceSales.length > 0) {
            const groupQty = currentPriceSales.reduce((acc, s) => acc + s.quantitySold, 0);
            const groupValue = currentPriceSales.reduce((acc, s) => acc + s.totalSaleValue, 0);
            const groupProfit = currentPriceSales.reduce((acc, s) => acc + s.profit, 0);
            
            salesByPrice.push({
                price: currentPrice,
                isCustom: currentPriceIsCustom,
                quantity: groupQty,
                salesValue: groupValue,
                profit: groupProfit
            });
        }

        // Calculate running stock
        let runningStock = totalPurchasedQty;
        let cumulativeSold = 0;
        
        const enhancedSalesByPrice = salesByPrice.map((group, index) => {
            const stockBeforeThisGroup = runningStock - cumulativeSold;
            cumulativeSold += group.quantity;
            
            return {
                ...group,
                stockBefore: stockBeforeThisGroup,
                stockAfter: runningStock - cumulativeSold
            };
        });

        res.json({
            success: true,
            productId,
            productName: product.name,
            sellingPrice: product.sellingRate,
            purchaseRate: product.purchaseRate,
            totalPurchasedQty: totalPurchasedQty,
            totalPurchaseValue: totalPurchaseValue,
            currentStock: product.quantity,
            totalSoldAll: totalSoldAll,
            totalRevenue: sales.reduce((acc, s) => acc + s.totalSaleValue, 0),
            totalProfit: sales.reduce((acc, s) => acc + s.profit, 0),
            customPriceSales: sales.filter(s => s.wasCustomPrice).length,
            salesByPrice: enhancedSalesByPrice,
            sales: sales.map(s => ({
                _id: s._id,
                quantity: s.quantitySold,
                sellingPrice: s.wasCustomPrice ? s.customSellingPrice : product.sellingRate,
                wasCustomPrice: s.wasCustomPrice,
                totalValue: s.totalSaleValue,
                profit: s.profit,
                date: s.createdAt
            }))
        });

    } catch (error) {
        console.error("GET SALES BY PRODUCT ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// ================= GET DAILY SALES =================
exports.getDailySales = async (req, res) => {
    try {
        const { date } = req.query;
        const queryDate = date ? new Date(date) : new Date();
        
        const startOfDay = new Date(queryDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(queryDate);
        endOfDay.setHours(23, 59, 59, 999);

        const sales = await Sale.find({
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        }).populate('productId', 'name sellingRate purchaseRate').sort({ createdAt: 1 });

        const totalSale = sales.reduce((acc, s) => acc + s.totalSaleValue, 0);
        const totalProfit = sales.reduce((acc, s) => acc + s.profit, 0);
        const customPriceSales = sales.filter(s => s.wasCustomPrice).length;

        // Group by product and price for daily report
        const salesByProduct = {};
        sales.forEach(sale => {
            if (!sale.productId) return;
            
            const key = `${sale.productId._id}_${sale.wasCustomPrice ? sale.customSellingPrice : 'standard'}`;
            if (!salesByProduct[key]) {
                salesByProduct[key] = {
                    productId: sale.productId._id,
                    productName: sale.productId.name,
                    sellingPrice: sale.productId.sellingRate,
                    customSellingPrice: sale.customSellingPrice,
                    wasCustomPrice: sale.wasCustomPrice,
                    quantity: 0,
                    amount: 0,
                    profit: 0
                };
            }
            salesByProduct[key].quantity += sale.quantitySold;
            salesByProduct[key].amount += sale.totalSaleValue;
            salesByProduct[key].profit += sale.profit;
        });

        res.json({
            success: true,
            date: startOfDay.toISOString().split('T')[0],
            totalTransactions: sales.length,
            totalSale,
            totalProfit,
            customPriceSales,
            salesByProduct: Object.values(salesByProduct),
            sales: sales.map(s => ({
                productName: s.productId?.name || 'Deleted Product',
                quantity: s.quantitySold,
                amount: s.totalSaleValue,
                profit: s.profit,
                wasCustomPrice: s.wasCustomPrice,
                customSellingPrice: s.customSellingPrice,
                sellingPrice: s.productId?.sellingRate
            }))
        });

    } catch (error) {
        console.error("GET DAILY SALES ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// ================= GET CUSTOM PRICE ANALYTICS =================
exports.getCustomPriceAnalytics = async (req, res) => {
    try {
        const customSales = await Sale.find({ wasCustomPrice: true })
            .populate('productId', 'name sellingRate purchaseRate')
            .sort({ createdAt: -1 });

        const analytics = {
            totalCustomSales: customSales.length,
            totalCustomValue: customSales.reduce((acc, s) => acc + s.totalSaleValue, 0),
            averageCustomPrice: customSales.reduce((acc, s) => acc + (s.customSellingPrice || 0), 0) / (customSales.length || 1),
            byProduct: {},
            byMonth: {},
            priceDistribution: {
                belowSellingPrice: 0,
                aboveSellingPrice: 0,
                equalSellingPrice: 0
            }
        };

        customSales.forEach(sale => {
            const productId = sale.productId?._id?.toString() || 'unknown';
            const productName = sale.productId?.name || 'Unknown';
            const month = new Date(sale.createdAt).toLocaleString('default', { month: 'long', year: 'numeric' });
            const sellingPrice = sale.productId?.sellingRate || sale.sellingPriceAtTime;
            const customPrice = sale.customSellingPrice || sale.sellingPriceAtTime;
            
            // Price distribution
            if (customPrice < sellingPrice) analytics.priceDistribution.belowSellingPrice++;
            else if (customPrice > sellingPrice) analytics.priceDistribution.aboveSellingPrice++;
            else analytics.priceDistribution.equalSellingPrice++;
            
            // By product
            if (!analytics.byProduct[productId]) {
                analytics.byProduct[productId] = {
                    productName,
                    count: 0,
                    totalValue: 0,
                    customPrices: []
                };
            }
            analytics.byProduct[productId].count++;
            analytics.byProduct[productId].totalValue += sale.totalSaleValue;
            analytics.byProduct[productId].customPrices.push({
                price: sale.customSellingPrice,
                sellingPrice: sellingPrice,
                quantity: sale.quantitySold,
                date: sale.createdAt
            });

            // By month
            if (!analytics.byMonth[month]) {
                analytics.byMonth[month] = {
                    count: 0,
                    totalValue: 0,
                    belowCount: 0,
                    aboveCount: 0,
                    equalCount: 0
                };
            }
            analytics.byMonth[month].count++;
            analytics.byMonth[month].totalValue += sale.totalSaleValue;
            
            if (customPrice < sellingPrice) analytics.byMonth[month].belowCount++;
            else if (customPrice > sellingPrice) analytics.byMonth[month].aboveCount++;
            else analytics.byMonth[month].equalCount++;
        });

        res.json({
            success: true,
            analytics
        });

    } catch (error) {
        console.error("CUSTOM PRICE ANALYTICS ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// ================= GET PRODUCTS WITH CUSTOM PRICE VARIANTS =================
exports.getProductsWithCustomVariants = async (req, res) => {
    try {
        const customSales = await Sale.find({ wasCustomPrice: true })
            .populate('productId', 'name sellingRate purchaseRate quantity')
            .sort({ createdAt: -1 });

        const productsMap = {};

        customSales.forEach(sale => {
            if (!sale.productId) return;
            
            const productId = sale.productId._id.toString();
            
            if (!productsMap[productId]) {
                productsMap[productId] = {
                    productId: productId,
                    productName: sale.productId.name,
                    sellingPrice: sale.productId.sellingRate,
                    purchaseRate: sale.productId.purchaseRate,
                    currentStock: sale.productId.quantity,
                    customVariants: []
                };
            }
            
            // Check if this custom price already exists
            const existingVariant = productsMap[productId].customVariants.find(
                v => v.customSellingPrice === sale.customSellingPrice
            );
            
            if (existingVariant) {
                existingVariant.quantity += sale.quantitySold;
                existingVariant.totalValue += sale.totalSaleValue;
                existingVariant.profit += sale.profit;
                existingVariant.transactionCount += 1;
            } else {
                productsMap[productId].customVariants.push({
                    customSellingPrice: sale.customSellingPrice,
                    quantity: sale.quantitySold,
                    totalValue: sale.totalSaleValue,
                    profit: sale.profit,
                    transactionCount: 1,
                    priceDifference: sale.customSellingPrice - sale.productId.sellingRate,
                    differencePercent: ((sale.customSellingPrice - sale.productId.sellingRate) / sale.productId.sellingRate * 100).toFixed(2)
                });
            }
        });

        const products = Object.values(productsMap).map(product => ({
            ...product,
            totalCustomSales: product.customVariants.reduce((acc, v) => acc + v.quantity, 0),
            totalCustomValue: product.customVariants.reduce((acc, v) => acc + v.totalValue, 0),
            variantCount: product.customVariants.length
        }));

        res.json({
            success: true,
            count: products.length,
            products: products
        });

    } catch (error) {
        console.error("GET PRODUCTS WITH CUSTOM VARIANTS ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// ================= GET COMPREHENSIVE PRODUCT SALES REPORT =================
exports.getComprehensiveProductReport = async (req, res) => {
    try {
        const { productId } = req.params;
        
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        
        const sales = await Sale.find({ productId })
            .sort({ createdAt: 1 }); // Ascending for chronological order
        
        // Calculate total purchased quantity
        const totalSoldAll = sales.reduce((acc, s) => acc + s.quantitySold, 0);
        const totalPurchasedQty = product.quantity + totalSoldAll;
        const totalPurchaseValue = totalPurchasedQty * product.purchaseRate;
        
        // Group sales by price in chronological order
        const salesByPrice = [];
        let currentPrice = null;
        let currentPriceSales = [];
        let currentPriceIsCustom = false;
        
        for (const sale of sales) {
            const salePrice = sale.wasCustomPrice ? sale.customSellingPrice : product.sellingRate;
            const isCustom = sale.wasCustomPrice;
            
            if (currentPrice !== salePrice) {
                if (currentPriceSales.length > 0) {
                    const groupQty = currentPriceSales.reduce((acc, s) => acc + s.quantitySold, 0);
                    const groupValue = currentPriceSales.reduce((acc, s) => acc + s.totalSaleValue, 0);
                    const groupProfit = currentPriceSales.reduce((acc, s) => acc + s.profit, 0);
                    
                    salesByPrice.push({
                        price: currentPrice,
                        isCustom: currentPriceIsCustom,
                        quantity: groupQty,
                        salesValue: groupValue,
                        profit: groupProfit
                    });
                }
                currentPrice = salePrice;
                currentPriceIsCustom = isCustom;
                currentPriceSales = [sale];
            } else {
                currentPriceSales.push(sale);
            }
        }
        
        if (currentPriceSales.length > 0) {
            const groupQty = currentPriceSales.reduce((acc, s) => acc + s.quantitySold, 0);
            const groupValue = currentPriceSales.reduce((acc, s) => acc + s.totalSaleValue, 0);
            const groupProfit = currentPriceSales.reduce((acc, s) => acc + s.profit, 0);
            
            salesByPrice.push({
                price: currentPrice,
                isCustom: currentPriceIsCustom,
                quantity: groupQty,
                salesValue: groupValue,
                profit: groupProfit
            });
        }
        
        // Create report rows with running stock
        const reportRows = [];
        let runningStock = totalPurchasedQty;
        let cumulativeSold = 0;
        
        salesByPrice.forEach((group, index) => {
            const stockBefore = runningStock - cumulativeSold;
            cumulativeSold += group.quantity;
            
            reportRows.push({
                productName: product.name,
                totalPurchasedQty: totalPurchasedQty,
                purchasePrice: product.purchaseRate,
                totalPurchaseValue: totalPurchaseValue,
                currentStock: stockBefore,
                totalSoldQty: group.quantity,
                sellingPrice: product.sellingRate,
                customSellingPrice: group.isCustom ? group.price : null,
                totalSalesValue: group.salesValue,
                profit: group.profit,
                profitMargin: group.salesValue > 0 ? ((group.profit / group.salesValue) * 100).toFixed(2) : "0.00",
                customPriceUsed: group.isCustom ? "Yes" : "No",
                sortOrder: index + 1
            });
        });
        
        res.json({
            success: true,
            productId: product._id,
            productName: product.name,
            report: reportRows
        });
        
    } catch (error) {
        console.error("GET COMPREHENSIVE PRODUCT REPORT ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};