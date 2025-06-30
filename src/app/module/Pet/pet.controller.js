const Pet = require('./Pet');


exports.createPet = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        // console.log(ownerId)
        const petPhoto = req.files ? req.files.map(file => file.path) : [];
        const { name, animalType, breed, age, gender, weight, height, color, description, medicalHistory } = req.body;
        const pet = new Pet({ name, animalType, breed, age, gender, weight, height, color, description, medicalHistory, userId, petPhoto });
        await pet.save();
        res.status(201).json({
            success: true,
            message: 'Pet created successfully',
            pet: pet
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

exports.getPet = async (req, res) => {
    try {
        const  id  = req.params.petId;
        const pet = await Pet.findById(id);
        if (!pet) {
            return res.status(404).json({ message: 'Pet not found' });
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

exports.updatePet = async (req, res) => {
    try {
        const pet = await Pet.findByIdAndUpdate(req.params.petId, req.body, { new: true });
        res.status(200).json({
            success: true,
            message: 'Pet updated successfully',
            pet: pet
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

exports.deletePet = async (req, res) => {
    try {
        const id  = req.params.petId;
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
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

