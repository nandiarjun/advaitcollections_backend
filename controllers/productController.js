const Product = require("../models/Product");
const Sale = require("../models/Sale");

// Auto barcode generator
const generateBarcode = () => {
    return "ADV" + Date.now() + Math.floor(Math.random() * 1000);
};

// ================= ADD PRODUCT =================
exports.addProduct = async (req, res) => {
    try {
        const {
            name,
            barcode,
            image,
            purchaseRate,
            sellingRate,
            quantity,
            gst
        } = req.body;

        // Validate required fields
        if (!name || !purchaseRate || !sellingRate || !quantity) {
            return res.status(400).json({
                message: "Name, purchase rate, selling rate and quantity are required"
            });
        }

        const finalBarcode = barcode && barcode.trim() !== ""
            ? barcode
            : generateBarcode();

        const existing = await Product.findOne({ barcode: finalBarcode });

        if (existing) {
            return res.status(400).json({
                message: "Barcode already exists"
            });
        }

        const product = new Product({
            name,
            barcode: finalBarcode,
            image: image || "",
            purchaseRate: Number(purchaseRate),
            sellingRate: Number(sellingRate),
            quantity: Number(quantity),
            gst: Number(gst) || 0
        });

        await product.save();

        res.status(201).json({
            success: true,
            message: "Product added successfully",
            product
        });

    } catch (error) {
        console.log("ADD PRODUCT ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// ================= GET ALL PRODUCTS =================
exports.getProducts = async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ================= DELETE PRODUCT =================
exports.deleteProduct = async (req, res) => {
    try {
        const { force } = req.query; // Check if force delete is requested
        const productId = req.params.id;

        // Check if product has sales
        const sales = await Sale.find({ productId: productId });
        
        if (sales.length > 0 && force !== "true") {
            // Return warning with sales count if not force delete
            return res.status(400).json({
                success: false,
                message: "Cannot delete product with sales history",
                hasSales: true,
                salesCount: sales.length,
                warning: "This product has sales records. Delete anyway?",
                productId: productId
            });
        }

        if (force === "true" && sales.length > 0) {
            // Force delete - remove all related sales first
            await Sale.deleteMany({ productId: productId });
        }

        // Delete the product
        await Product.findByIdAndDelete(productId);
        
        res.json({ 
            success: true,
            message: sales.length > 0 
                ? "Product and all related sales history deleted successfully" 
                : "Product Deleted Successfully",
            deletedSalesCount: sales.length
        });

    } catch (error) {
        console.error("DELETE PRODUCT ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// ================= UPDATE PRODUCT =================
exports.updateProduct = async (req, res) => {
    try {
        const { barcode } = req.body;
        
        // Check if barcode is being changed and if it already exists
        if (barcode) {
            const existing = await Product.findOne({ 
                barcode, 
                _id: { $ne: req.params.id } 
            });
            
            if (existing) {
                return res.status(400).json({
                    message: "Barcode already exists"
                });
            }
        }

        const updated = await Product.findByIdAndUpdate(
            req.params.id,
            {
                ...req.body,
                purchaseRate: Number(req.body.purchaseRate),
                sellingRate: Number(req.body.sellingRate),
                quantity: Number(req.body.quantity),
                gst: Number(req.body.gst) || 0
            },
            { new: true }
        );

        res.json({
            success: true,
            message: "Product updated successfully",
            product: updated
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ================= DASHBOARD SUMMARY =================
exports.getDashboardSummary = async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();

        const products = await Product.find();
        const totalStock = products.reduce((acc, item) => acc + item.quantity, 0);

        const sales = await Sale.find();

        const totalSaleValue = sales.reduce((acc, sale) => acc + sale.totalSaleValue, 0);
        const totalPurchaseValue = sales.reduce((acc, sale) => acc + sale.totalPurchaseValue, 0);
        const totalProfit = totalSaleValue - totalPurchaseValue;

        // Get today's sales
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todaySales = sales.filter(sale => 
            new Date(sale.createdAt) >= today
        );
        
        const todaySaleValue = todaySales.reduce((acc, sale) => acc + sale.totalSaleValue, 0);
        const todayProfit = todaySales.reduce((acc, sale) => acc + sale.profit, 0);

        res.json({
            totalProducts,
            totalStock,
            totalSaleValue,
            totalPurchaseValue,
            totalProfit,
            todaySaleValue,
            todayProfit
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ================= PRODUCT REPORT =================
exports.getProductReport = async (req, res) => {
    try {
        const products = await Product.find();
        const sales = await Sale.find();

        const report = products.map(product => {
            const productSales = sales.filter(
                sale => sale.productId.toString() === product._id.toString()
            );

            const totalSoldQty = productSales.reduce(
                (acc, sale) => acc + sale.quantitySold, 0
            );

            const totalSalesValue = productSales.reduce(
                (acc, sale) => acc + sale.totalSaleValue, 0
            );

            // Total purchased quantity = sold quantity + current stock
            const totalPurchasedQty = totalSoldQty + product.quantity;

            const totalPurchaseValue = productSales.reduce(
                (acc, sale) => acc + sale.totalPurchaseValue, 0
            ) + (product.quantity * product.purchaseRate);

            const profit = productSales.reduce(
                (acc, sale) => acc + sale.profit, 0
            );

            const profitMargin = totalSalesValue > 0 
                ? ((profit / totalSalesValue) * 100).toFixed(2) 
                : 0;

            return {
                productName: product.name,
                barcode: product.barcode,
                currentStock: product.quantity,
                totalSoldQty,
                totalPurchasedQty,
                totalPurchaseValue: Math.round(totalPurchaseValue * 100) / 100,
                totalSalesValue: Math.round(totalSalesValue * 100) / 100,
                profit: Math.round(profit * 100) / 100,
                profitMargin: profitMargin,
                purchaseRate: product.purchaseRate,
                sellingRate: product.sellingRate
            };
        });

        res.json(report);

    } catch (error) {
        console.error("REPORT ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// ================= GET PRODUCT SALES HISTORY =================
exports.getProductSalesHistory = async (req, res) => {
    try {
        const productId = req.params.id;
        const sales = await Sale.find({ productId }).sort({ createdAt: -1 });
        
        res.json({
            success: true,
            salesCount: sales.length,
            sales: sales
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};