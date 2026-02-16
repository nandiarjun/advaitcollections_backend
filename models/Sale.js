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
    customSellingPrice: {
        type: Number,
        default: null
    },
    wasCustomPrice: {
        type: Boolean,
        default: false
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

// Index for faster queries
saleSchema.index({ productId: 1, createdAt: -1 });
saleSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Sale", saleSchema);