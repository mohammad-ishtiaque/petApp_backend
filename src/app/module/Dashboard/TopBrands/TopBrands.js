const mongoose = require('mongoose');

const topBrandSchema = new mongoose.Schema({
    logo: [{
        type: String,
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

const TopBrand = mongoose.model('TopBrand', topBrandSchema);

module.exports = TopBrand;
