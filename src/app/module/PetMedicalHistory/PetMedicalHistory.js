const mongoose = require('mongoose');

const petMedicalHistorySchema = new mongoose.Schema({
    petId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pet',
    },
    treatmentType: {
        type: String,
        default: ''
    },
    treatmentDate: {
        type: Date,
        default: Date.now
    },
    treatmentName: {
        type: String,
        default: ''
    },
    doctorName: {
        type: String,
        default: ''
    },
    treatmentDescription: {
        type: String,
        default: ''
    },
    treatmentStatus: {
        type: String,
        enum: ['PENDING', 'COMPLETED'], 
        default: 'PENDING'
    }
}, { timestamps: true })

const PetMedicalHistory = mongoose.model('PetMedicalHistory', petMedicalHistorySchema);

module.exports = PetMedicalHistory;