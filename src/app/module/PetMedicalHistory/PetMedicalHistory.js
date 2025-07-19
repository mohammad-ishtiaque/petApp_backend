const mongoose = require('mongoose');

const petMedicalHistorySchema = new mongoose.Schema({
    petId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pet',
    },
    treatmentType: {
        type: String,
    },
    treatmentDate: {
        type: Date,
    },
    treatmentName: {
        type: String,
    },
    doctorName: {
        type: String,
    },
    treatmentDescription: {
        type: String,
    },
    // treatmentCategory: {
    //     type: String,
    //     enum: ['WELLNESS', 'MEDICAL_RECORD'],
    treatmentStatus: {
        type: String,
        enum: ['PENDING', 'COMPLETED'], 
        default: 'PENDING'
    },
}, { timestamps: true })

const PetMedicalHistory = mongoose.model('PetMedicalHistory', petMedicalHistorySchema);

module.exports = PetMedicalHistory;

