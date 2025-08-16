const User = require('../User/User');
const Pet = require('./Pet');
const { ApiError } = require('../../../errors/errorHandler');
const {deleteFile} = require('../../../utils/unLinkFiles');
const asyncHandler = require('../../../utils/asyncHandler');
const PetMedicalHistory = require('../PetMedicalHistory/PetMedicalHistory');

exports.createPet = async (req, res, next) => {
    try {
        const userId = req.user.id || req.user._id;
        // console.log(ownerId)
        const petPhoto = req.file ? req.file.path : null;
        const { name, animalType, breed, age, gender, weight, height, color, description } = req.body;
        const pet = new Pet({ name, animalType, breed, age, gender, weight, height, color, description, userId, petPhoto });
        await pet.save();
        const user = await User.findById(userId);
        if (!user) {
            return next(new ApiError('User not found', 404));
        }
        user.pets.push(pet._id);
        await user.save();
        res.status(201).json({
            success: true,
            message: 'Pet created successfully',
            pet: pet
        });
    } catch (error) {
        return next(new ApiError('Failed to create pet', 500));
    }
}



exports.getPet = async (req, res, next) => {
    try {
        const id = req.params.petId;
        const pet = await Pet.findById(id);
        if (!pet) {
            return next(new ApiError('Pet not found', 404));
        }
        return res.status(200).json({
            success: true,
            message: 'Pet fetched successfully',
            pet: pet
        });
    } catch (error) {
        return next(new ApiError('Failed to fetch pet', 500)); 
    }
}

exports.updatePet = async (req, res, next) => {
    try {
        const pet = await Pet.findByIdAndUpdate(req.params.petId, req.body, { new: true });
        if (!pet) {
            return next(new ApiError('Pet not found', 404));
        }
        if (req.file) {
            const oldPetPhoto = pet.petPhoto;
            pet.petPhoto = req.file.path;
            await pet.save();
            if (oldPetPhoto) {
                try {
                    await deleteFile(oldPetPhoto);
                } catch (deleteError) {
                    console.error(`Error deleting file ${oldPetPhoto}:`, deleteError);
                }
            }
        }
        res.status(200).json({
            success: true,
            message: 'Pet updated successfully',
            pet: pet
        });
    } catch (error) {
        return next(new ApiError('Failed to update pet', 500));
    }
}

exports.deletePet = async (req, res, next) => {
    try {
        const id = req.params.petId;
        const existingPet = await Pet.findById(id);

        if (existingPet.petPhoto) {
            try {
                await deleteFile(existingPet.petPhoto);
            } catch (deleteError) {
                console.error(`Error deleting file ${existingPet.petPhoto}:`, deleteError);
            }
        }

        await Pet.findByIdAndDelete(id);
        res.status(200).json({
            success: true,
            message: 'Pet deleted successfully'
        });
    } catch (error) {
        return next(new ApiError('Failed to delete pet', 500));
    }
}

exports.getAllPets = async (req, res, next) => {
    try {
        const userId = req.user.id || req.user._id;
        const pet = await Pet.find({ userId })
        if (!pet) {
            return next(new ApiError('Pet not found', 404));
        }
        return res.status(200).json({
            success: true,
            message: 'Pet fetched successfully',
            pet: pet
        });
    } catch (error) {
        return next(new ApiError('Failed to fetch pet', 500));
    }
}

exports.petMedicalHistoryById = async (req, res, next) => {
    try {
        const { id: petId } = req.params;
        const { treatmentStatus, page = 1, limit = 10 } = req.query;

        // Build query
        const query = { petId };
        if (treatmentStatus) {
            query.treatmentStatus = treatmentStatus.trim().toUpperCase();
        }

        // Pagination values
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Fetch paginated medical history
        const [medicalHistory, total] = await Promise.all([
            PetMedicalHistory.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            PetMedicalHistory.countDocuments(query)
        ]);

        if (!medicalHistory || medicalHistory.length === 0) {
            return next(new ApiError('No medical history found', 404));
        }

        return res.status(200).json({
            success: true,
            message: 'Medical history fetched successfully',
            totalRecords: total,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            data: medicalHistory
        });
    } catch (error) {
        return next(new ApiError(error.message || 'Failed to fetch medical history', 500));
    }
};
