const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const protect = require("../middleware/authMiddleware");
const {
    getSettings,
    updateSettings,
    updateBusinessInfo,
    updateContactInfo,
    updateSocialMedia,
    updateBusinessHours,
    updateAboutContent,
    updateSeoSettings,
    updateThemeSettings,
    updateFooterContent,
    addPhoneNumber,
    removePhoneNumber,
    addEmail,
    removeEmail,
    addTeamMember,
    updateTeamMember,
    removeTeamMember,
    addCoreValue,
    removeCoreValue,
    uploadLogo,
    uploadFavicon,
    uploadTeamMemberImage,
    deleteImage
} = require("../controllers/settingController");

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|ico|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
});

// All routes are protected (admin only)
router.get("/", protect, getSettings);
router.put("/", protect, updateSettings);

// Image Upload Routes
router.post("/upload/logo", protect, upload.single('logo'), uploadLogo);
router.post("/upload/favicon", protect, upload.single('favicon'), uploadFavicon);
router.post("/upload/team/:memberIndex", protect, upload.single('image'), uploadTeamMemberImage);
router.delete("/image/:type/:publicId", protect, deleteImage);

// Business Info
router.put("/business", protect, updateBusinessInfo);

// Contact Info
router.put("/contact", protect, updateContactInfo);
router.post("/phone", protect, addPhoneNumber);
router.delete("/phone/:index", protect, removePhoneNumber);
router.post("/email", protect, addEmail);
router.delete("/email/:index", protect, removeEmail);

// Social Media
router.put("/social", protect, updateSocialMedia);

// Business Hours
router.put("/hours", protect, updateBusinessHours);

// About Content
router.put("/about", protect, updateAboutContent);
router.post("/team", protect, addTeamMember);
router.put("/team/:index", protect, updateTeamMember);
router.delete("/team/:index", protect, removeTeamMember);
router.post("/values", protect, addCoreValue);
router.delete("/values/:index", protect, removeCoreValue);

// SEO
router.put("/seo", protect, updateSeoSettings);

// Theme
router.put("/theme", protect, updateThemeSettings);

// Footer
router.put("/footer", protect, updateFooterContent);

module.exports = router;