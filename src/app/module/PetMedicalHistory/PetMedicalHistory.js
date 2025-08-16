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
    treatmentStatus: {
        type: String,
        enum: ['PENDING', 'COMPLETED'], 
        default: 'PENDING'
    }
}, { timestamps: true })

const PetMedicalHistory = mongoose.model('PetMedicalHistory', petMedicalHistorySchema);

module.exports = PetMedicalHistory;