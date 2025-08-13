const Faq = require('./Faq');
const { ApiError } = require('../../../../errors/errorHandler');
const asyncHandler = require('../../../../utils/asyncHandler');

exports.createFaq = asyncHandler(async (req, res, next) => {
    const { question, answer } = req.body || {};
    if (!question || !answer) {
        throw new ApiError('Question and answer are required', 400);
    }
    try {
        const faq = new Faq({
            question: question.trim(),
            answer: answer.trim()
        });
        await faq.save();
        res.status(201).json({
            success: true,
            message: 'Faq created successfully',
            faq
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
});

exports.getAllFaqs = asyncHandler(async (req, res, next) => {
    try {
        const faqs = await Faq.find();
        if (!faqs) throw new ApiError('Faqs not found', 404);
        res.status(200).json({
            success: true,
            message: 'Faqs fetched successfully',
            faqs
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
});

exports.updateFaq = asyncHandler(async (req, res, next) => {
    const { question, answer } = req.body;
    try {
        const faq = await Faq.findByIdAndUpdate(req.params.id,
            { 
                question: question.trim(), 
                answer: answer.trim() 
            }, 
            { new: true });
        if (!faq) throw new ApiError('Faq not found', 404);
        res.status(200).json({
            success: true,
            message: 'Faq updated successfully',
            faq
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
});

exports.deleteFaq = asyncHandler(async (req, res, next) => {
    try {
        const faq = await Faq.findByIdAndDelete(req.params.id);
        if (!faq) throw new ApiError('Faq not found', 404);
        res.status(200).json({
            success: true,
            message: 'Faq deleted successfully',
            faq
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
});

exports.getFaqById = asyncHandler(async (req, res, next) => {
    try {
        const faq = await Faq.findById(req.params.id);
        if (!faq) throw new ApiError('Faq not found', 404);
        res.status(200).json({
            success: true,
            message: 'Faq fetched successfully',
            faq
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
});

