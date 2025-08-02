const User = require('../User/User');
const Pet = require('./Pet');
const { ApiError } = require('../../../errors/errorHandler');
const {deleteFile} = require('../../../utils/unLinkFiles');
const asyncHandler = require('../../../utils/asyncHandler');


exports.createPet = async (req, res, next) => {
    try {
        const userId = req.user.id || req.user._id;
        // console.log(ownerId)
        const petPhoto = req.files ? req.files.map(file => file.path) : [];
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
            message: 'Pet created successfully',
            pet: pet
        });
    } catch (error) {
        return next(new ApiError('Failed to create pet', 500)); 
    }
}

exports.updatePet = async (req, res, next) => {
    try {
        const pet = await Pet.findByIdAndUpdate(req.params.petId, req.body, { new: true });
        if (!pet) {
            return next(new ApiError('Pet not found', 404));
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

        if (existingPet.petPhoto && existingPet.petPhoto.length > 0) {
            for (const image of existingPet.petPhoto) {
                try {
                    await deleteFile(image.url);
                } catch (deleteError) {
                    console.error(`Error deleting file ${image.url}:`, deleteError);
                }
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
            message: 'Pet created successfully',
            pet: pet
        });
    } catch (error) {
        return next(new ApiError('Failed to create pet', 500));
    }
}
