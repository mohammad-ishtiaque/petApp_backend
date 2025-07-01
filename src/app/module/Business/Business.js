
const mongoose = require('mongoose');


const businessSchema = new mongoose.Schema({
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner' },
    businessName: {
        type: String,
        required: true,
        trim: true
    },
    businessType: {
        type: String,
        enum:   ['VET', 'SHOP', 'HOTEL', 'TRAINING', 'FRIENDLY', 'GROOMING']
    }, // ['vet', 'shop', 'hotel', etc.]
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
    advertisementImg: [{ type: String }],
    // servicesId: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Service',
    // },
    // services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
    // reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
    createdAt: { type: Date, default: Date.now }
  });
  

const Business = mongoose.model('Business', businessSchema);
  
module.exports = Business;