import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import validator from "validator";
import { OAuth2Client } from "google-auth-library";
import userModel from "../models/user.model.js";

const generateToken = (userId) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined");
    }

    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "7d"
        }
    );
};


/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Basic validation
        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Check if user exists with Google OAuth
        const existingGoogleUser = await userModel.findOne({ email, googleId: { $exists: true } });
        if (existingGoogleUser) {
            return res.status(409).json({ message: "An account with this email already exists. Please use Google Sign In." });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        // Check if user already exists
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: "User already exists" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await userModel.create({
            name,
            email,
            password: hashedPassword,
            roles: ["INTERVIEWEE"] // forced default
        });



        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            message: "User registered successfully",
            token
        });
    } catch (error) {
        res.status(500).json({ message: "Registration failed" });
    }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // Fetch user with password
        const user = await userModel.findOne({ email }).select("+password");
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Check if user has a password (Google OAuth users don't have passwords)
        if (!user.password) {
            return res.status(401).json({ message: "This account was created with Google. Please use Google Sign In." });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Generate token
        const token = generateToken(user._id);

        res.status(200).json({
            message: "Login successful",
            token
        });
    } catch (error) {
        res.status(500).json({ message: "Login failed" });
    }
};

/**
 * @desc    Google OAuth login
 * @route   POST /api/auth/google
 * @access  Public
 */
export const googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({ message: "Google credential is required" });
        }

        // Verify Google token
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        let ticket;
        
        try {
            ticket = await client.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
        } catch (error) {
            return res.status(401).json({ message: "Invalid Google token" });
        }

        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        if (!email) {
            return res.status(400).json({ message: "Email not provided by Google" });
        }

        // Check if user exists
        let user = await userModel.findOne({ email });

        if (user) {
            // User exists - update googleId if not set
            if (!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }
        } else {
            // Create new user
            user = await userModel.create({
                name: name || email.split('@')[0],
                email,
                googleId,
                roles: ["INTERVIEWEE"], // forced default
            });
        }

        // Generate token
        const token = generateToken(user._id);

        res.status(200).json({
            message: "Google login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                roles: user.roles,
            }
        });
    } catch (error) {
        console.error("Google login error:", error);
        res.status(500).json({ message: "Google login failed" });
    }
};

/**
 * @desc    Get logged-in user details
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res) => {
    res.status(200).json(req.user);
};
