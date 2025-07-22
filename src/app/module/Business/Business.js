
const mongoose = require('mongoose');


const businessSchema = new mongoose.Schema({
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner' },
    businessName: {
        type: String,
        required: true,
        trim: true
    },
    // businessType: {
    //     type: String,
    //     enum:   ['VET', 'SHOP', 'HOTEL', 'TRAINING', 'FRIENDLY', 'GROOMING'],
    //     trim: true
    // }, 
    website: {
        type: String,
    },
    address: {
      type: String,
    },
    moreInfo: {
      type: String,
    },
    shopLogo: {
      type: String,
    },
    shopPic: {
      type: [String],
    },
    advertisement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Advertisement'
    },
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
    createdAt: { type: Date, default: Date.now }
  });
  

const Business = mongoose.model('Business', businessSchema);
  
module.exports = Business;