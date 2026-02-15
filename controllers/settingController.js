const Setting = require("../models/Setting");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");

// ================= GET SETTINGS =================
exports.getSettings = async (req, res) => {
    try {
        const settings = await Setting.getSettings();
        res.json({
            success: true,
            settings
        });
    } catch (error) {
        console.error("GET SETTINGS ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// ================= UPDATE SETTINGS =================
exports.updateSettings = async (req, res) => {
    try {
        let settings = await Setting.findOne();
        
        if (!settings) {
            settings = new Setting(req.body);
        } else {
            // Update existing settings
            Object.assign(settings, req.body);
        }

        await settings.save();

        res.json({
            success: true,
            message: "Settings updated successfully",
            settings
        });
    } catch (error) {
        console.error("UPDATE SETTINGS ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// ================= UPLOAD LOGO =================
exports.uploadLogo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const settings = await Setting.getSettings();
        
        // Delete old logo from cloudinary if exists
        if (settings.logo?.publicId) {
            await cloudinary.uploader.destroy(settings.logo.publicId);
        }

        // Upload new logo
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: "advait-collections/logo",
            transformation: [
                { width: 200, height: 200, crop: "limit" },
                { quality: "auto" }
            ]
        });

        // Update settings with new logo
        settings.logo = {
            url: result.secure_url,
            publicId: result.public_id
        };
        await settings.save();

        // Delete temporary file
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            message: "Logo uploaded successfully",
            logo: settings.logo
        });
    } catch (error) {
        console.error("UPLOAD LOGO ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// ================= UPLOAD FAVICON =================
exports.uploadFavicon = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const settings = await Setting.getSettings();
        
        // Delete old favicon from cloudinary if exists
        if (settings.favicon?.publicId) {
            await cloudinary.uploader.destroy(settings.favicon.publicId);
        }

        // Upload new favicon
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: "advait-collections/favicon",
            transformation: [
                { width: 32, height: 32, crop: "limit" },
                { quality: "auto" }
            ]
        });

        // Update settings with new favicon
        settings.favicon = {
            url: result.secure_url,
            publicId: result.public_id
        };
        await settings.save();

        // Delete temporary file
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            message: "Favicon uploaded successfully",
            favicon: settings.favicon
        });
    } catch (error) {
        console.error("UPLOAD FAVICON ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// ================= UPLOAD TEAM MEMBER IMAGE =================
exports.uploadTeamMemberImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const { memberIndex } = req.params;
        const settings = await Setting.getSettings();
        
        const index = parseInt(memberIndex);
        if (index < 0 || index >= settings.aboutContent.teamMembers.length) {
            return res.status(400).json({ message: "Invalid team member index" });
        }

        // Delete old image from cloudinary if exists
        if (settings.aboutContent.teamMembers[index].image?.publicId) {
            await cloudinary.uploader.destroy(settings.aboutContent.teamMembers[index].image.publicId);
        }

        // Upload new image
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: "advait-collections/team",
            transformation: [
                { width: 400, height: 400, crop: "limit" },
                { quality: "auto" },
                { fetch_format: "auto" }
            ]
        });

        // Update team member image
        settings.aboutContent.teamMembers[index].image = {
            url: result.secure_url,
            publicId: result.public_id
        };
        await settings.save();

        // Delete temporary file
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            message: "Team member image uploaded successfully",
            image: settings.aboutContent.teamMembers[index].image
        });
    } catch (error) {
        console.error("UPLOAD TEAM MEMBER IMAGE ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// ================= DELETE IMAGE =================
exports.deleteImage = async (req, res) => {
    try {
        const { type, publicId } = req.params;
        const settings = await Setting.getSettings();

        if (type === "logo") {
            if (settings.logo?.publicId) {
                await cloudinary.uploader.destroy(settings.logo.publicId);
                settings.logo = { url: "", publicId: "" };
            }
        } else if (type === "favicon") {
            if (settings.favicon?.publicId) {
                await cloudinary.uploader.destroy(settings.favicon.publicId);
                settings.favicon = { url: "", publicId: "" };
            }
        }

        await settings.save();

        res.json({
            success: true,
            message: "Image deleted successfully"
        });
    } catch (error) {
        console.error("DELETE IMAGE ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// ================= UPDATE BUSINESS INFO =================
exports.updateBusinessInfo = async (req, res) => {
    try {
        const settings = await Setting.getSettings();
        
        settings.businessName = req.body.businessName || settings.businessName;
        settings.tagline = req.body.tagline || settings.tagline;
        settings.description = req.body.description || settings.description;

        await settings.save();

        res.json({
            success: true,
            message: "Business information updated successfully",
            settings
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ================= UPDATE CONTACT INFO =================
exports.updateContactInfo = async (req, res) => {
    try {
        const settings = await Setting.getSettings();
        
        settings.address = req.body.address || settings.address;
        settings.phoneNumbers = req.body.phoneNumbers || settings.phoneNumbers;
        settings.emails = req.body.emails || settings.emails;

        await settings.save();

        res.json({
            success: true,
            message: "Contact information updated successfully",
            settings
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ================= UPDATE SOCIAL MEDIA =================
exports.updateSocialMedia = async (req, res) => {
    try {
        const settings = await Setting.getSettings();
        
        settings.socialMedia = req.body.socialMedia || settings.socialMedia;

        await settings.save();

        res.json({
            success: true,
            message: "Social media links updated successfully",
            settings
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ================= UPDATE BUSINESS HOURS =================
exports.updateBusinessHours = async (req, res) => {
    try {
        const settings = await Setting.getSettings();
        
        settings.businessHours = req.body.businessHours || settings.businessHours;

        await settings.save();

        res.json({
            success: true,
            message: "Business hours updated successfully",
            settings
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ================= UPDATE ABOUT CONTENT =================
exports.updateAboutContent = async (req, res) => {
    try {
        const settings = await Setting.getSettings();
        
        settings.aboutContent.story = req.body.story || settings.aboutContent.story;
        settings.aboutContent.vision = req.body.vision || settings.aboutContent.vision;
        settings.aboutContent.mission = req.body.mission || settings.aboutContent.mission;
        settings.aboutContent.foundedYear = req.body.foundedYear || settings.aboutContent.foundedYear;

        await settings.save();

        res.json({
            success: true,
            message: "About page content updated successfully",
            settings
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ================= UPDATE SEO SETTINGS =================
exports.updateSeoSettings = async (req, res) => {
    try {
        const settings = await Setting.getSettings();
        
        settings.seo = req.body.seo || settings.seo;

        await settings.save();

        res.json({
            success: true,
            message: "SEO settings updated successfully",
            settings
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ================= UPDATE THEME SETTINGS =================
exports.updateThemeSettings = async (req, res) => {
    try {
        const settings = await Setting.getSettings();
        
        settings.theme = req.body.theme || settings.theme;

        await settings.save();

        res.json({
            success: true,
            message: "Theme settings updated successfully",
            settings
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ================= UPDATE FOOTER CONTENT =================
exports.updateFooterContent = async (req, res) => {
    try {
        const settings = await Setting.getSettings();
        
        settings.footer = req.body.footer || settings.footer;

        await settings.save();

        res.json({
            success: true,
            message: "Footer content updated successfully",
            settings
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ================= ADD PHONE NUMBER =================
exports.addPhoneNumber = async (req, res) => {
    try {
        const settings = await Setting.getSettings();
        
        const newPhone = {
            type: req.body.type,
            number: req.body.number,
            isPrimary: req.body.isPrimary || false
        };

        // If this is primary, unset other primary phones
        if (newPhone.isPrimary) {
            settings.phoneNumbers.forEach(phone => {
                phone.isPrimary = false;
            });
        }

        settings.phoneNumbers.push(newPhone);
        await settings.save();

        res.json({
            success: true,
            message: "Phone number added successfully",
            settings
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ================= REMOVE PHONE NUMBER =================
exports.removePhoneNumber = async (req, res) => {
    try {
        const settings = await Setting.getSettings();
        
        const index = parseInt(req.params.index);
        if (index >= 0 && index < settings.phoneNumbers.length) {
            settings.phoneNumbers.splice(index, 1);
            await settings.save();
        }

        res.json({
            success: true,
            message: "Phone number removed successfully",
            settings
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ================= ADD EMAIL =================
exports.addEmail = async (req, res) => {
    try {
        const settings = await Setting.getSettings();
        
        const newEmail = {
            type: req.body.type,
            email: req.body.email,
            isPrimary: req.body.isPrimary || false
        };

        // If this is primary, unset other primary emails
        if (newEmail.isPrimary) {
            settings.emails.forEach(email => {
                email.isPrimary = false;
            });
        }

        settings.emails.push(newEmail);
        await settings.save();

        res.json({
            success: true,
            message: "Email added successfully",
            settings
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ================= REMOVE EMAIL =================
exports.removeEmail = async (req, res) => {
    try {
        const settings = await Setting.getSettings();
        
        const index = parseInt(req.params.index);
        if (index >= 0 && index < settings.emails.length) {
            settings.emails.splice(index, 1);
            await settings.save();
        }

        res.json({
            success: true,
            message: "Email removed successfully",
            settings
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ================= ADD TEAM MEMBER =================
exports.addTeamMember = async (req, res) => {
    try {
        const settings = await Setting.getSettings();
        
        const newMember = {
            name: req.body.name,
            position: req.body.position,
            image: { url: "", publicId: "" },
            bio: req.body.bio
        };

        settings.aboutContent.teamMembers.push(newMember);
        await settings.save();

        res.json({
            success: true,
            message: "Team member added successfully",
            settings
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ================= UPDATE TEAM MEMBER =================
exports.updateTeamMember = async (req, res) => {
    try {
        const settings = await Setting.getSettings();
        const index = parseInt(req.params.index);
        
        if (index >= 0 && index < settings.aboutContent.teamMembers.length) {
            settings.aboutContent.teamMembers[index].name = req.body.name || settings.aboutContent.teamMembers[index].name;
            settings.aboutContent.teamMembers[index].position = req.body.position || settings.aboutContent.teamMembers[index].position;
            settings.aboutContent.teamMembers[index].bio = req.body.bio || settings.aboutContent.teamMembers[index].bio;
            
            await settings.save();
        }

        res.json({
            success: true,
            message: "Team member updated successfully",
            settings
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ================= REMOVE TEAM MEMBER =================
exports.removeTeamMember = async (req, res) => {
    try {
        const settings = await Setting.getSettings();
        const index = parseInt(req.params.index);
        
        if (index >= 0 && index < settings.aboutContent.teamMembers.length) {
            // Delete image from cloudinary if exists
            if (settings.aboutContent.teamMembers[index].image?.publicId) {
                await cloudinary.uploader.destroy(settings.aboutContent.teamMembers[index].image.publicId);
            }
            
            settings.aboutContent.teamMembers.splice(index, 1);
            await settings.save();
        }

        res.json({
            success: true,
            message: "Team member removed successfully",
            settings
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ================= ADD CORE VALUE =================
exports.addCoreValue = async (req, res) => {
    try {
        const settings = await Setting.getSettings();
        
        settings.aboutContent.coreValues.push(req.body);
        await settings.save();

        res.json({
            success: true,
            message: "Core value added successfully",
            settings
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ================= REMOVE CORE VALUE =================
exports.removeCoreValue = async (req, res) => {
    try {
        const settings = await Setting.getSettings();
        const index = parseInt(req.params.index);
        
        if (index >= 0 && index < settings.aboutContent.coreValues.length) {
            settings.aboutContent.coreValues.splice(index, 1);
            await settings.save();
        }

        res.json({
            success: true,
            message: "Core value removed successfully",
            settings
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};