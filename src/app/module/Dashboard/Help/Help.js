const mongoose = require('mongoose');

const helpSchema = new mongoose.Schema({
    email: {
        type: String,
    },
    phone: {
        type: String,
    },
    message: {
        type: String,
    },
    status: {
        type: String,
        enum: ['PENDING', 'COMPLETED'],
        default: 'PENDING'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' || 'Owner',
    },
}, { timestamps: true })

const Help = mongoose.model('Help', helpSchema);

module.exports = Help;
