const multer = require("multer");
const path = require("path");
const { ApiError } = require("../errors/errorHandler");

// Storage engine (different folders for images and PDFs)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, "uploads"); 
    } else {
      cb(new ApiError("Invalid file type", 400), false);
    }
  },
  // In your upload middleware
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filters (allow only images & PDFs)
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
  if (allowedImageTypes.includes(file.mimetype) || file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new ApiError("Only image (jpg, png, webp) and PDF files are allowed", 400), false);
  }
};

// File size limits (e.g., 5MB images, 50MB PDFs)
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, 
});

module.exports = upload;
