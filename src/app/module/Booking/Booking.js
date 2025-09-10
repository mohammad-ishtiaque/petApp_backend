const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    bookingDate: {
        type: Date,
    },
    bookingTime: {
        type: String,
    },
    // for the hotel booking. 
    checkInTime: {
        type: String,
    },
    checkOutTime: {
        type: String,
    },
    checkInDate: {
        type: Date,
    },
    checkOutDate: {
        type: Date,
    },
    bookingStatus: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'REJECTED', 'APPROVED', 'CANCELLED'],
        default: 'PENDING'
    },
    cancellationReason: {
        type: String,
    },
    notes: {
        type: String,
    },
    selectedService: {
        type: String,
    },
    serviceType: {
        type: String
    },
    businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Owner',
    },
    petId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pet',
    }, 
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    
}, { timestamps: true })

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;

 