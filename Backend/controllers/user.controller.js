import userModel from "../models/user.model.js";

/**
 * @desc    Get logged-in user's profile
 * @route   GET /api/users/profile
 * @access  Private
 */
export const getProfile = async (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

/**
 * @desc    Update logged-in user's profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
export const updateProfile = async (req, res) => {
  try {
    const {
      name,
      skills,
      experienceLevel,
      timezone,
      availability,
      roles
    } = req.body;

    const user = await userModel.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    /* -----------------------------
       Update basic profile fields
    ------------------------------ */
    if (name) user.name = name;
    if (skills) user.skills = skills;
    if (experienceLevel) user.experienceLevel = experienceLevel;


    if (timezone) {
      user.timezone = timezone; // Expect IANA string like "Asia/Kolkata"
    }

    
    /* -----------------------------
    Availability (UTC-based)
    ------------------------------ */
    if (Array.isArray(availability)) {
      user.availability = availability.map(slot => ({
        startTime: new Date(slot.startTime),
        endTime: new Date(slot.endTime)
      }));
    }
    
    /* -----------------------------
    Role Whitelisting (CRITICAL)
    ------------------------------ */
    const ALLOWED_ROLES = ["INTERVIEWEE", "INTERVIEWER"];
    
    if (Array.isArray(roles)) {
      const sanitizedRoles = roles.filter(role =>
        ALLOWED_ROLES.includes(role)
      );
      
      // Always ensure INTERVIEWEE exists
      if (!sanitizedRoles.includes("INTERVIEWEE")) {
        sanitizedRoles.push("INTERVIEWEE");
      }
      
      user.roles = sanitizedRoles;
    }
    
    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update profile" });
  }
};
