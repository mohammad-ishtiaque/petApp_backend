const express = require('express');
const router = express.Router();

const { getPetOwnerDetailsById, getAllPetOwners, blockPetOwner, unblockPetOwner } = require('./PetOwners/petOwners.controller');
const { getBusinessOwnerDetailsById, getAllBusinessOwners, blockBusinessOwner, unblockBusinessOwner } = require('./BusinessOwner/businessOwner.controller');
// const { getPetDetailsById, getAllPets, blockPet, unblockPet } = require('./pets.controller');   

router.get('/pet-owner/:id', getPetOwnerDetailsById);
router.get('/pet-owners', getAllPetOwners);
router.put('/pet-owner/:id/block', blockPetOwner);
router.put('/pet-owner/:id/unblock', unblockPetOwner);

router.get('/business-owner/:id', getBusinessOwnerDetailsById);
router.get('/business-owners', getAllBusinessOwners);
router.put('/business-owner/:id/block', blockBusinessOwner);
router.put('/business-owner/:id/unblock', unblockBusinessOwner);  

module.exports = router;