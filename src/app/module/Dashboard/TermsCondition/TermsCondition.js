const mongoose = require('mongoose');

const dataSchema = new mongoose.Schema({
    description: {
        type: String,
    }
}, { timestamps: true })

const TermsCondition = mongoose.model('TermsCondition', dataSchema);

module.exports = TermsCondition;
