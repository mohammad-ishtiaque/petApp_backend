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
    bookingStatus: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'REJECTED'],
        default: 'PENDING'
    },
    notes: {
        type: String,
    },
    businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
    },
    
}, { timestamps: true })

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;

 