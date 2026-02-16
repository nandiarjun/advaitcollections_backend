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
        const { force } = req.query;
        const productId = req.params.id;

        const sales = await Sale.find({ productId: productId });
        
        if (sales.length > 0 && force !== "true") {
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
            await Sale.deleteMany({ productId: productId });
        }

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

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todaySales = sales.filter(sale => new Date(sale.createdAt) >= today);
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

// ================= PRODUCT REPORT WITH CORRECT RUNNING STOCK =================
exports.getProductReport = async (req, res) => {
    try {
        const products = await Product.find({}).sort({ name: 1 });
        const sales = await Sale.find({}).populate('productId').sort({ createdAt: 1 }); // Ascending for chronological order
        
        const report = [];
        
        // Process each product
        for (const product of products) {
            const productSales = sales.filter(s => 
                s.productId?._id?.toString() === product._id.toString()
            ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // Oldest first
            
            // Calculate total purchased quantity (original stock + all sold)
            const totalSoldAll = productSales.reduce((acc, s) => acc + s.quantitySold, 0);
            const totalPurchasedQty = product.quantity + totalSoldAll;
            const purchasePrice = product.purchaseRate;
            const totalPurchaseValue = totalPurchasedQty * purchasePrice;
            
            if (productSales.length === 0) {
                // Product with NO sales - one row
                report.push({
                    productName: product.name,
                    totalPurchasedQty: totalPurchasedQty,
                    purchasePrice: purchasePrice,
                    totalPurchaseValue: totalPurchaseValue,
                    currentStock: product.quantity,
                    totalSoldQty: 0,
                    sellingPrice: product.sellingRate,
                    customSellingPrice: null,
                    totalSalesValue: 0,
                    profit: 0,
                    profitMargin: "0.00",
                    customPriceUsed: "No",
                    sortOrder: 1
                });
            } else {
                // Group sales by price in chronological order
                const salesByPrice = [];
                let currentPrice = null;
                let currentPriceSales = [];
                let currentPriceIsCustom = false;
                
                // Process each sale in chronological order
                for (const sale of productSales) {
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
                
                // Calculate running stock - start with total purchased
                let runningStock = totalPurchasedQty;
                let cumulativeSold = 0;
                
                // Create rows for each price group
                salesByPrice.forEach((group, index) => {
                    // Stock BEFORE these sales
                    const stockBefore = runningStock - cumulativeSold;
                    
                    // Add this group's sales
                    cumulativeSold += group.quantity;
                    
                    // Stock AFTER these sales (this is what should show in Current Stock column)
                    const stockAfter = runningStock - cumulativeSold;
                    
                    report.push({
                        productName: product.name,
                        totalPurchasedQty: totalPurchasedQty,
                        purchasePrice: purchasePrice,
                        totalPurchaseValue: totalPurchaseValue,
                        currentStock: stockAfter, // Stock AFTER these sales (running balance)
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
            }
        }
        
        // Sort report by product name and then by sortOrder
        report.sort((a, b) => {
            if (a.productName !== b.productName) {
                return a.productName.localeCompare(b.productName);
            }
            return (a.sortOrder || 0) - (b.sortOrder || 0);
        });

        console.log(`Generated report with ${report.length} rows`);
        res.json(report);

    } catch (error) {
        console.error("Error generating product report:", error);
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

// ================= GET CUSTOM PRICE VARIANTS FOR A PRODUCT =================
exports.getProductPriceVariants = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId);
        
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        
        const sales = await Sale.find({ 
            productId: productId,
            wasCustomPrice: true 
        }).sort({ customSellingPrice: 1 });
        
        const uniquePrices = [...new Set(sales.map(s => s.customSellingPrice))];
        
        const variants = uniquePrices.map(price => {
            const priceSales = sales.filter(s => s.customSellingPrice === price);
            const totalQty = priceSales.reduce((acc, s) => acc + s.quantitySold, 0);
            const totalValue = priceSales.reduce((acc, s) => acc + s.totalSaleValue, 0);
            const profit = priceSales.reduce((acc, s) => acc + s.profit, 0);
            
            return {
                customPrice: price,
                quantity: totalQty,
                totalValue: totalValue,
                profit: profit,
                saleCount: priceSales.length,
                transactions: priceSales.map(s => ({
                    _id: s._id,
                    quantity: s.quantitySold,
                    totalValue: s.totalSaleValue,
                    profit: s.profit,
                    date: s.createdAt
                }))
            };
        });
        
        res.json({
            success: true,
            productId: product._id,
            productName: product.name,
            sellingPrice: product.sellingRate,
            variants: variants
        });
        
    } catch (error) {
        console.error("Error getting price variants:", error);
        res.status(500).json({ message: error.message });
    }
};