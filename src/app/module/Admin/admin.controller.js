const Admin = require("./Admin");
const { ApiError } = require("../../../errors/errorHandler");
const bcrypt = require("bcrypt");

exports.makeAdmin = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new ApiError("Name, email, and password are required", 400);
    }

    // Check if admin with this email already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      throw new ApiError("Admin with this email already exists", 409);
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin
    const newAdmin = new Admin({
      name,
      email,
      password: hashedPassword,
      role: "ADMIN",
    });

    await newAdmin.save();

    // Exclude password from response
    const adminResponse = newAdmin.toObject();
    delete adminResponse.password;

    return res.status(201).json({
      message: "Admin created successfully",
      admin: adminResponse,
    });
  } catch (error) {
    return next(error);
  }
};

exports.makeSuperAdmin = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new ApiError("Name, email, and password are required", 400);
    }

    // Check if super admin with this email already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      throw new ApiError("Admin with this email already exists", 409);
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new super admin
    const newSuperAdmin = new Admin({
      name,
      email,
      password: hashedPassword,
      role: "SUPER_ADMIN",
    });

    await newSuperAdmin.save();

    // Exclude password from response
    const adminResponse = newSuperAdmin.toObject();
    delete adminResponse.password;

    return res.status(201).json({
      message: "Super Admin created successfully",
      admin: adminResponse,
    });
  } catch (error) {
    return next(error);
  }
};

exports.removeAdmin = async (req, res, next) => {
  try {
    const { adminId } = req.body;
    const admin = await Admin.findById(adminId);
    if (!admin) throw new ApiError("Admin not found", 404);
    await Admin.deleteOne({ _id: adminId });
    return res.status(200).json({ message: "Admin deleted successfully" });
  } catch (error) {
    return next(error);
  }
};

exports.removeSuperAdmin = async (req, res, next) => {
  try {
    const { adminId } = req.body;
    const admin = await Admin.findById(adminId);
    if (!admin) throw new ApiError("Admin not found", 404);
    admin.role = "USER";
    await admin.save();
    return res
      .status(200)
      .json({ message: "Super Admin removed successfully" });
  } catch (error) {
    return next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.admin.id || req.admin._id).select(
      "-password"
    );
    console.log(admin);

    if (!admin) throw new ApiError("Admin not found", 404);
    return res.status(200).json({ admin });
  } catch (error) {
    return next(error);
  }
};

exports.updateAdminProfile = async (req, res) => {
  try {
    const id = req.admin.id;

    // Prepare update data
    const updateData = {
      name: req.body.name,
      contact: req.body.contact,
      address: req.body.address,
    };

    // If there's an uploaded file, add it to the update data
    if (req.file) {
      updateData.profilePic = req.file.location
        .replace(/\\/g, "/")
        .replace("public", "");
    }

    // Find and update the admin
    const admin = await Admin.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    res.status(200).json({
      success: true,
      data: admin,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating admin:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error while updating admin profile",
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const id = req.admin.id;
    const admin = await Admin.findById(id);
    if (!admin) throw new ApiError("Admin not found", 404);
    const isMatch = await bcrypt.compare(req.body.oldPassword, admin.password);
    if (!isMatch) throw new ApiError("Invalid old password", 401);
    if (req.body.newPassword !== req.body.confirmNewPassword)
      throw new ApiError("New passwords do not match", 400);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.newPassword, salt);
    admin.password = hashedPassword;
    await admin.save();
    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error while changing password",
    });
  }
};

// Create a super admin if none exists
(async () => {
  const superAdmin = await Admin.findOne({ role: "SUPER_ADMIN" });
  if (!superAdmin) {
    const newSuperAdmin = new Admin({
      name: "Aman",
      email: "mdshahamanpatwary@gmail.com",
      password: await bcrypt.hash("superadmin123", 10),
      role: "SUPER_ADMIN",
    });
    await newSuperAdmin.save();
  }
})();


