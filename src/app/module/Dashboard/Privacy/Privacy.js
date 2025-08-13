const mongoose = require('mongoose');

const privacySchema = new mongoose.Schema({
    description: {
        type: String,
    }
}, { timestamps: true })

const Privacy = mongoose.model('Privacy', privacySchema);

module.exports = Privacy;
