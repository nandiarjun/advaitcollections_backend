const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    barcode: {
        type: String,
        unique: true,
        required: true
    },
    image: {
        type: String,
        default: ""
    },
    purchaseRate: {
        type: Number,
        required: true,
        min: 0
    },
    sellingRate: {
        type: Number,
        required: true,
        min: 0
    },
    quantity: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    gst: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Product", productSchema);