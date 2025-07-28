const express = require('express');
const router = express.Router();
const {
    createPet,
    getPet,
    updatePet,
    deletePet,
    getAllPets
} = require('./pet.controller');
const { authenticateUser } = require('../../middleware/auth.middleware');
const upload = require('../../../utils/upload');




router.post('/create', authenticateUser, upload.array('petPhoto', 2), createPet);
router.get('/get/:petId', authenticateUser, getPet);
router.put('/update/:petId', authenticateUser, upload.array('petPhoto', 2), updatePet);
router.delete('/delete/:petId', authenticateUser, deletePet);
router.get('/get', authenticateUser, getAllPets);

module.exports = router;