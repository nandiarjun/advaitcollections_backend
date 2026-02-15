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

        // Calculate values
        const sellingPrice = customSellingPrice || product.sellingRate;
        const purchasePrice = product.purchaseRate;
        
        const totalSaleValue = sellingPrice * quantitySold;
        const totalPurchaseValue = purchasePrice * quantitySold;
        const profit = totalSaleValue - totalPurchaseValue;

        // Update product quantity
        product.quantity -= quantitySold;
        await product.save();

        // Create sale record
        const sale = new Sale({
            productId,
            quantitySold,
            sellingPriceAtTime: sellingPrice,
            purchasePriceAtTime: purchasePrice,
            totalSaleValue,
            totalPurchaseValue,
            profit,
            gstApplied: product.gst || 0
        });

        await sale.save();

        // Populate product details for response
        await sale.populate('productId', 'name barcode');

        res.json({ 
            success: true,
            message: "Sale Completed Successfully", 
            sale,
            remainingStock: product.quantity
        });

    } catch (error) {
        console.error("SELL ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

exports.getSummary = async (req, res) => {
    try {
        const sales = await Sale.find().populate('productId', 'name barcode');

        const totalSale = sales.reduce((acc, s) => acc + s.totalSaleValue, 0);
        const totalPurchase = sales.reduce((acc, s) => acc + s.totalPurchaseValue, 0);
        const totalProfit = sales.reduce((acc, s) => acc + s.profit, 0);

        // Get sales by date
        const salesByDate = {};
        sales.forEach(sale => {
            const date = new Date(sale.createdAt).toLocaleDateString();
            if (!salesByDate[date]) {
                salesByDate[date] = {
                    totalSale: 0,
                    totalProfit: 0,
                    count: 0
                };
            }
            salesByDate[date].totalSale += sale.totalSaleValue;
            salesByDate[date].totalProfit += sale.profit;
            salesByDate[date].count += 1;
        });

        res.json({ 
            totalSale: Math.round(totalSale * 100) / 100,
            totalPurchase: Math.round(totalPurchase * 100) / 100,
            totalProfit: Math.round(totalProfit * 100) / 100,
            totalTransactions: sales.length,
            salesByDate,
            recentSales: sales.slice(-10).reverse() // Last 10 sales
        });

    } catch (error) {
        console.error("SUMMARY ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

exports.getSalesHistory = async (req, res) => {
    try {
        const sales = await Sale.find()
            .populate('productId', 'name barcode')
            .sort({ createdAt: -1 });

        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};