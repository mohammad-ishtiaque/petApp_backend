const express = require('express');
const router  = express.Router();

const { createPetMedicalHistory, getPetMedicalHistoryByTreatmentStatus, updatePetMedicalHistory, deletePetMedicalHistory, getPetMedicalHistoryByPetId } = require('./petMedicalHistory.controller');
const { authenticateOwner, authenticateOwnerAndUser } = require('../../middleware/auth.middleware');
router.post('/create/:petId', authenticateOwner, createPetMedicalHistory);
router.get('/get/:petId', authenticateOwnerAndUser, getPetMedicalHistoryByTreatmentStatus);
router.put('/update/:treatmentId', authenticateOwner, updatePetMedicalHistory);
router.delete('/delete/:treatmentId', authenticateOwner, deletePetMedicalHistory);
router.get('/get-medicalHist-by-pet-id/:petId', authenticateOwnerAndUser, getPetMedicalHistoryByPetId);


module.exports = router;
