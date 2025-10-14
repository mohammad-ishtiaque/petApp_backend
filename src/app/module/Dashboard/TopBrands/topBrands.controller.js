const TopBrand = require('./TopBrands');
const asyncHandler = require('../../../../utils/asyncHandler');
const { ApiError } = require('../../../../errors/errorHandler');


exports.createTopBrand = asyncHandler(async (req, res) => {
    // Support multer single/array/fields and prefer S3 location
    let uploadedLogo = null;
    if (req.file) {
        uploadedLogo = req.file.location || req.file.path || null;
    } else if (req.files) {
        if (Array.isArray(req.files)) {
            uploadedLogo = req.files[0]?.location || req.files[0]?.path || null;
        } else if (req.files.logo && Array.isArray(req.files.logo)) {
            uploadedLogo = req.files.logo[0]?.location || req.files.logo[0]?.path || null;
        }
    }

    const topBrandData = {
        ...req.body,
        // Schema expects an array of strings
        logo: uploadedLogo ? [uploadedLogo] : [],
    };

    const topBrand = await TopBrand.create(topBrandData);
    if (!topBrand) throw new ApiError('Top brand not created', 400);
    
    res.status(201).json({
        success: true,
        message: 'Top brand created successfully',
        topBrand
    });
});

exports.getAllTopBrands = asyncHandler(async (req, res) => {
    const topBrands = await TopBrand.find();
    if (!topBrands.length) {
        res.status(200).json({
            success: true,
            message: 'No top brands found',
            topBrands
        });
    }
    res.status(200).json({
        success: true,
        message: 'Top brands fetched successfully',
        topBrands
    });
});

exports.deleteTopBrand = asyncHandler(async (req, res) => {
    const topBrandId = req.params.id;
    const topBrand = await TopBrand.findByIdAndDelete(topBrandId);
    if (!topBrand) throw new ApiError('Top brand not found', 404);
    res.status(200).json({
        success: true,
        message: 'Top brand deleted successfully',
        topBrand
    });
});
