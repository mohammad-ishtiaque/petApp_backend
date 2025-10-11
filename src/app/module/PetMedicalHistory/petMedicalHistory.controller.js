const asyncHandler = require('../../../utils/asyncHandler');
const PetMedicalHistory = require('./PetMedicalHistory');
const { ApiError } = require('../../../errors/errorHandler');
const Pet = require('../Pet/Pet');

exports.createPetMedicalHistory = asyncHandler(async (req, res) => {
    const petId = req.params.petId;
    const { treatmentType, treatmentDate, treatmentName, doctorName, treatmentDescription, treatmentStatus, treatmentCategory } = req.body;

    if (!petId) throw new ApiError('Pet ID is required', 400);

    const petMedicalHistory = await PetMedicalHistory.create({
        petId,
        treatmentType,
        treatmentDate,
        treatmentName,
        doctorName,
        treatmentDescription,
        treatmentStatus: treatmentStatus?.toUpperCase(),
    });
    // Link this history entry into the Pet document for populate support
    const pet = await Pet.findByIdAndUpdate(petId, { $push: { medicalHistory: petMedicalHistory._id } }, { new: true });
    if (!pet) throw new ApiError('Pet not found', 404);

    res.status(201).json({
        success: true,
        message: 'Pet Medical History created successfully',
        petMedicalHistory,
    });

});

exports.getPetMedicalHistoryByTreatmentStatus = asyncHandler(async (req, res) => {
    const petId = req.params.petId;
    const treatmentStatus = req.query.treatmentStatus;

    // Pagination values from query params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const petMedicalHistory = await PetMedicalHistory.find({ petId })
        .find({ treatmentStatus: treatmentStatus?.toUpperCase() })
        .skip(skip)
        .limit(limit);
    console.log(petMedicalHistory);
    if (!petMedicalHistory) {
        res.status(200).json({
            success: true,
            message: 'Pet Medical History not found',
            data: []
        });
    };
    // Count total matching docs for pagination info
    const total = await PetMedicalHistory.countDocuments({ treatmentStatus: treatmentStatus?.toUpperCase() });

    res.status(200).json({
        success: true,
        message: 'Pet Medical History retrieved successfully',
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        petMedicalHistory
    });
});


exports.updatePetMedicalHistory = asyncHandler(async (req, res) => {
    const treatmentId = req.params.treatmentId;
    const petMedicalHistory = await PetMedicalHistory.findById(treatmentId);
    if (!petMedicalHistory) throw new ApiError('Pet Medical History not found', 404);
    petMedicalHistory.treatmentType = req.body.treatmentType || petMedicalHistory.treatmentType;
    petMedicalHistory.doctorName = req.body.doctorName || petMedicalHistory.doctorName;
    petMedicalHistory.treatmentDate = req.body.treatmentDate || petMedicalHistory.treatmentDate;
    petMedicalHistory.treatmentName = req.body.treatmentName || petMedicalHistory.treatmentName;
    petMedicalHistory.treatmentDescription = req.body.treatmentDescription || petMedicalHistory.treatmentDescription;
    petMedicalHistory.treatmentStatus = req.body.treatmentStatus || petMedicalHistory.treatmentStatus;
    await petMedicalHistory.save();
    res.status(200).json({
        success: true,
        message: 'Pet Medical History updated successfully',
        petMedicalHistory
    });
});

exports.deletePetMedicalHistory = asyncHandler(async (req, res) => {
    const treatmentId = req.params.treatmentId;
    const petMedicalHistory = await PetMedicalHistory.findById(treatmentId);
    if (!petMedicalHistory) throw new ApiError('Pet Medical History not found', 404);
    // Detach from Pet.medicalHistory array before deletion
    await Pet.findByIdAndUpdate(petMedicalHistory.petId, { $pull: { medicalHistory: petMedicalHistory._id } });
    console.log
    await petMedicalHistory.deleteOne();
    res.status(200).json({
        success: true,
        message: 'Pet Medical History deleted successfully',
    });
});


exports.getPetMedicalHistoryByPetId = asyncHandler(async (req, res) => {
    const petId = req.params.petId;

    // Pagination values from query params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const petMedicalHistory = await PetMedicalHistory.find({ petId })
        .skip(skip)
        .limit(limit);

    if (!petMedicalHistory) throw new ApiError('Pet Medical History not found', 404);

    const total = await PetMedicalHistory.countDocuments({ petId });

    res.status(200).json({
        success: true,
        message: 'Pet Medical History retrieved successfully',
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        petMedicalHistory
    });
});


exports.getAllPetMedicalHistoryByLoggedInOwner = asyncHandler(async (req, res) => {
    const ownerId = req.ownerId;
    // Find all PetMedicalHistory records for this owner, sorted by newest first (createdAt descending)
    const petMedicalHistory = await PetMedicalHistory.find({ ownerId }).sort({ createdAt: -1 })
        .populate('petId', 'name profilePic userId');
    // .populate('userId', 'name email profilePic');
    if (!petMedicalHistory) throw new ApiError('Pet Medical History not found', 404);
    res.status(200).json({
        success: true,
        message: 'Pet Medical History retrieved successfully',
        petMedicalHistory
    });
});
