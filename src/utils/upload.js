const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const s3 = require("../config/s3"); // 👈 your AWS S3 client
const { ApiError } = require("../errors/errorHandler");

// Allowed file types
const allowedImageTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
const allowedPdfTypes = ["application/pdf"];

// File filter
const fileFilter = (req, file, cb) => {
  if (allowedImageTypes.includes(file.mimetype) || allowedPdfTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError("Only images (jpg, png, webp) and PDFs are allowed", 400), false);
  }
};

// Multer-S3 storage
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME, // 👈 must exist in .env
    acl: "private", // 👈 use "private" for signed URLs, "public-read" for direct access
    key: (req, file, cb) => {
      let folder = "others";
      if (file.mimetype.startsWith("image/")) {
        folder = "images";
      } else if (file.mimetype === "application/pdf") {
        folder = "pdfs";
      }
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, `${folder}/${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  }),
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 10 MB
});

module.exports = upload;
