const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Register Admin (only once)
exports.registerAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = new Admin({
            email,
            password: hashedPassword
        });

        await admin.save();

        res.json({ message: "Admin Registered Successfully" });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Login Admin
exports.loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(400).json({ message: "Admin Not Found" });
        }

        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Invalid Password" });
        }

        const token = jwt.sign(
            { id: admin._id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({ message: "Login Successful", token });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
