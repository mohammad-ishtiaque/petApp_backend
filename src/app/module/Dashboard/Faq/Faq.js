const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
    question: {
        type: String,
    },
    answer: {
        type: String,
    }
}, { timestamps: true })

const Faq = mongoose.model('Faq', faqSchema);

module.exports = Faq;