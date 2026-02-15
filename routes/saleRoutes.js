const router = require("express").Router();
const { 
    sellProduct, 
    getSummary,
    getSalesHistory 
} = require("../controllers/saleController");
const protect = require("../middleware/authMiddleware");

router.post("/sell", protect, sellProduct);
router.get("/summary", protect, getSummary);
router.get("/history", protect, getSalesHistory);

module.exports = router;