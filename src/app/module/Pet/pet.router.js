const express = require('express');
const router = express.Router();
const {
    createPet,
    getPet,
    updatePet,
    deletePet,
    getAllPets,
    petMedicalHistoryById
} = require('./pet.controller');
const { authenticateUser } = require('../../middleware/auth.middleware');
const upload = require('../../../utils/upload');



router.post('/create', authenticateUser, upload.single('petPhoto'), createPet);
router.get('/get/:petId', authenticateUser, getPet);
router.put('/update/:petId', authenticateUser, upload.single('petPhoto'), updatePet);
router.delete('/delete/:petId', authenticateUser, deletePet);
router.get('/get', authenticateUser, getAllPets);
router.get('/get-medical-history/:id', authenticateUser, petMedicalHistoryById);

module.exports = router;