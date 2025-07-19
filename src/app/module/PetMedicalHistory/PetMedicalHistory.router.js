const express = require('express');
const router  = express.Router();

const { createPetMedicalHistory, getPetMedicalHistoryByTreatmentCategory, updatePetMedicalHistory, deletePetMedicalHistory } = require('./petMedicalHistory.controller');
const { authenticateOwner, authenticateOwnerAndUser } = require('../../middleware/auth.middleware');
router.post('/create/:petId', authenticateOwner, createPetMedicalHistory);
router.get('/get/:petId', authenticateOwnerAndUser, getPetMedicalHistoryByTreatmentCategory);
router.put('/update/:treatmentId', authenticateOwner, updatePetMedicalHistory);
router.delete('/delete/:treatmentId', authenticateOwner, deletePetMedicalHistory);

module.exports = router;
