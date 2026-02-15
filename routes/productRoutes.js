const router = require("express").Router();
const protect = require("../middleware/authMiddleware");
const {
    addProduct,
    getProducts,
    deleteProduct,
    updateProduct,
    getDashboardSummary,
    getProductReport,
    getProductSalesHistory
} = require("../controllers/productController");

// Public routes
router.get("/", getProducts);

// Protected routes
router.post("/add", protect, addProduct);
router.delete("/delete/:id", protect, deleteProduct);
router.put("/update/:id", protect, updateProduct);
router.get("/dashboard-summary", protect, getDashboardSummary);
router.get("/product-report", protect, getProductReport);
router.get("/sales-history/:id", protect, getProductSalesHistory);

module.exports = router;