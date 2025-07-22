const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    serviceType: {
        type: String,
        enum: ['VET', 'SHOP', 'HOTEL', 'TRAINING', 'FRIENDLY', 'GROOMING'],
        trim: true
    },
    serviceName: {
        type: String,
        required: true
    },
    location: {
        type: String,
    },
    openingTime: {
        type: String,
        required: true
    },

    closingTime: {
        type: String,
        required: true
    },
    offDay: {
        type: String,
        required: true
    },
    websiteLink: {
        type: String,
    },

    servicesImages: [{ type: String }],
    
    businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
    },
}, { timestamps: true })

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;