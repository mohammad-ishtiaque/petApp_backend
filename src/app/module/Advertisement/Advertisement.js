const mongoose = require('mongoose');


const advertisementSchema = new mongoose.Schema({
    advertisementImg: [{ type: String }],
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'INACTIVE' },
    owner : { type: Object },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true })

const Advertisement = mongoose.model('Advertisement', advertisementSchema);

module.exports = Advertisement;
