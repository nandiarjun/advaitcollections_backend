const router = require("express").Router();
const { 
    sellProduct, 
    getSummary,
    getSalesHistory,
    getSaleById,
    getSalesByProduct,
    getDailySales
} = require("../controllers/saleController");
const protect = require("../middleware/authMiddleware");

// All routes are protected (admin only)
router.post("/sell", protect, sellProduct);
router.get("/summary", protect, getSummary);
router.get("/history", protect, getSalesHistory);
router.get("/daily", protect, getDailySales);
router.get("/product/:productId", protect, getSalesByProduct);
router.get("/:id", protect, getSaleById);

module.exports = router;