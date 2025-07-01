const mongoose = require('mongoose');


const advertisementSchema = new mongoose.Schema({
    advertisementImg: [{ type: String }],
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner' },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true })

const Advertisement = mongoose.model('Advertisement', advertisementSchema);

module.exports = Advertisement;
