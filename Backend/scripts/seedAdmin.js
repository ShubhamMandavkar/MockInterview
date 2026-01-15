import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import path from "path";
import userModel from "../models/user.model.js";
import connectDB from "../config/db.js";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// dotenv.config();
dotenv.config({
    path: path.resolve(__dirname, "../.env")
  });

const seedAdmin = async () => {
  try {
    await connectDB();

    console.log("Connected to database");

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      throw new Error("ADMIN_EMAIL or ADMIN_PASSWORD not set");
    }

    // Check if admin already exists
    const existingAdmin = await userModel.findOne({
      email: adminEmail
    });

    if (existingAdmin) {
      console.log("Admin already exists. Skipping seeding.");
      process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // Create admin
    const admin = new userModel({
        name: "Super Admin",
        email: adminEmail.toLowerCase(),
        password: hashedPassword,
        roles: ["ADMIN"]
      });
      
      admin.$locals.isSeededAdmin = true;
      
      await admin.save();

    console.log("Admin user seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("Admin seeding failed:", error.message);
    process.exit(1);
  }
};

seedAdmin();
