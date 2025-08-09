const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads');
  },
  filename: function (req, file, cb) {
    // Just keep filename generation as is
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, JPG, GIF and WEBP are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Middleware wrapper to normalize the file path after upload
const uploadMiddleware = (fieldName) => (req, res, next) => {
  const multerMiddleware = upload.single(fieldName);

  multerMiddleware(req, res, (err) => {
    if (err) return next(err);

    // If a file was uploaded, normalize the path
    if (req.file && req.file.path) {
      req.file.path = req.file.path.replace(/\\/g, '/');
    }

    next();
  });
};


const uploadArrayMiddleware = (fieldName, maxCount) => (req, res, next) => {
  const multerMiddleware = upload.array(fieldName, maxCount);

  multerMiddleware(req, res, (err) => {
    if (err) return next(err);

    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (file.path) {
          file.path = file.path.replace(/\\/g, '/');  // normalize backslashes to forward slashes
        }
      });
    }

    next();
  });
};

module.exports = {
  uploadMiddleware,
  uploadArrayMiddleware
};
