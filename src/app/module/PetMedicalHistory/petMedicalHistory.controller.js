const asyncHandler = require('../../../utils/asyncHandler');
const PetMedicalHistory = require('./PetMedicalHistory');
const { ApiError } = require('../../../errors/errorHandler');

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
        // treatmentCategory: treatmentCategory.toUpperCase()
    });
    res.status(201).json({
        success: true,
        message: 'Pet Medical History created successfully',
        petMedicalHistory
    });
    
});

exports.getPetMedicalHistoryByTreatmentCategory = asyncHandler(async (req, res) => {
    const petId = req.params.petId;
    const treatmentCategory = req.query.treatmentCategory;
    const petMedicalHistory = await PetMedicalHistory.find({ petId });
    if (!petMedicalHistory) throw new ApiError('Pet Medical History not found', 404);
    // console.log(petMedicalHistory.treatmentCategory)
    const petMedicalHistoryByTreatmentCategory = await PetMedicalHistory.find({ treatmentCategory: treatmentCategory?.toUpperCase() });
    // console.log(petMedicalHistoryByTreatmentCategory)

    res.status(200).json({
        success: true,
        message: 'Pet Medical History retrieved successfully',
        petMedicalHistoryByTreatmentCategory
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
    // petMedicalHistory.treatmentCategory = req.body.treatmentCategory || petMedicalHistory.treatmentCategory;
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
    await petMedicalHistory.deleteOne();
    res.status(200).json({
        success: true,
        message: 'Pet Medical History deleted successfully',
    });
});


exports.getPetMedicalHistoryByPetId = asyncHandler(async (req, res) => {
    const petId = req.params.petId;
    // const treatmentCategory = req.query.treatmentCategory;
    const petMedicalHistory = await PetMedicalHistory.find({ petId });
    if (!petMedicalHistory) throw new ApiError('Pet Medical History not found', 404);
    // console.log(petMedicalHistory.treatmentCategory)
    // const petMedicalHistoryByTreatmentCategory = await PetMedicalHistory.find({ treatmentCategory: treatmentCategory.toUpperCase() });
    // console.log(petMedicalHistoryByTreatmentCategory)

    res.status(200).json({
        success: true,
        message: 'Pet Medical History retrieved successfully',
        petMedicalHistory
    });
});

