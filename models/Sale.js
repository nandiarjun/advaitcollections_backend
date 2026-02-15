const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
    quantitySold: {
        type: Number,
        required: true,
        min: 1
    },
    sellingPriceAtTime: {
        type: Number,
        required: true
    },
    purchasePriceAtTime: {
        type: Number,
        required: true
    },
    totalSaleValue: {
        type: Number,
        required: true
    },
    totalPurchaseValue: {
        type: Number,
        required: true
    },
    profit: {
        type: Number,
        required: true
    },
    gstApplied: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Sale", saleSchema);