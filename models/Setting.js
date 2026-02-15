const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema({
    // Business Information
    businessName: {
        type: String,
        required: true,
        default: "Advait Collections"
    },
    tagline: {
        type: String,
        default: "Premium Garments & Fashion Accessories"
    },
    description: {
        type: String,
        default: "Your trusted garments retailer since 2015"
    },
    logo: {
        type: Object,
        default: {
            url: "",
            publicId: ""
        }
    },
    favicon: {
        type: Object,
        default: {
            url: "",
            publicId: ""
        }
    },
    
    // Contact Information
    address: {
        street: { type: String, default: "123 Fashion Street" },
        city: { type: String, default: "Bengaluru" },
        state: { type: String, default: "Karnataka" },
        country: { type: String, default: "India" },
        pincode: { type: String, default: "560034" },
        fullAddress: { type: String, default: "123 Fashion Street, Koramangala, Bengaluru - 560034" }
    },
    
    phoneNumbers: [{
        type: { type: String, enum: ["sales", "support", "office"], default: "office" },
        number: String,
        isPrimary: { type: Boolean, default: false }
    }],
    
    emails: [{
        type: { type: String, enum: ["general", "support", "info"], default: "general" },
        email: String,
        isPrimary: { type: Boolean, default: false }
    }],
    
    // Social Media Links
    socialMedia: {
        facebook: { type: String, default: "" },
        instagram: { type: String, default: "" },
        twitter: { type: String, default: "" },
        youtube: { type: String, default: "" },
        linkedin: { type: String, default: "" },
        whatsapp: { type: String, default: "" },
        pinterest: { type: String, default: "" }
    },
    
    // Business Hours
    businessHours: {
        monday: { open: { type: String, default: "10:00" }, close: { type: String, default: "20:00" }, closed: { type: Boolean, default: false } },
        tuesday: { open: { type: String, default: "10:00" }, close: { type: String, default: "20:00" }, closed: { type: Boolean, default: false } },
        wednesday: { open: { type: String, default: "10:00" }, close: { type: String, default: "20:00" }, closed: { type: Boolean, default: false } },
        thursday: { open: { type: String, default: "10:00" }, close: { type: String, default: "20:00" }, closed: { type: Boolean, default: false } },
        friday: { open: { type: String, default: "10:00" }, close: { type: String, default: "20:00" }, closed: { type: Boolean, default: false } },
        saturday: { open: { type: String, default: "10:00" }, close: { type: String, default: "18:00" }, closed: { type: Boolean, default: false } },
        sunday: { open: { type: String, default: "11:00" }, close: { type: String, default: "17:00" }, closed: { type: Boolean, default: true } }
    },
    
    // About Page Content
    aboutContent: {
        story: { type: String, default: "Founded in 2015, Advait Collections started with a simple mission: to provide high-quality, fashionable clothing at affordable prices." },
        vision: { type: String, default: "To become a leading garments retailer known for quality, affordability, and trust." },
        mission: { type: String, default: "To provide the latest fashion styles with excellent customer service and transparent pricing." },
        foundedYear: { type: Number, default: 2015 },
        teamMembers: [{
            name: String,
            position: String,
            image: {
                url: { type: String, default: "" },
                publicId: { type: String, default: "" }
            },
            bio: String
        }],
        coreValues: [{
            title: String,
            description: String,
            icon: String
        }]
    },
    
    // SEO Settings
    seo: {
        metaTitle: { type: String, default: "Advait Collections - Premium Garments Store" },
        metaDescription: { type: String, default: "Discover premium fashion at Advait Collections. Quality clothing for men, women, and kids." },
        metaKeywords: { type: String, default: "fashion, clothing, garments, retail, store, Bangalore" },
        googleAnalyticsId: { type: String, default: "" }
    },
    
    // Theme Settings
    theme: {
        primaryColor: { type: String, default: "#2c3e50" },
        secondaryColor: { type: String, default: "#e74c3c" },
        accentColor: { type: String, default: "#3498db" },
        fontFamily: { type: String, default: "Poppins" }
    },
    
    // Footer Content
    footer: {
        copyright: { type: String, default: "© {year} Advait Collections. All rights reserved." },
        showNewsletter: { type: Boolean, default: true },
        paymentMethods: [String],
        quickLinks: [{
            title: String,
            url: String
        }]
    }
}, {
    timestamps: true
});

// Ensure only one settings document exists
settingSchema.statics.getSettings = async function() {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

module.exports = mongoose.model("Setting", settingSchema);