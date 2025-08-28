const mongoose = require('mongoose');
const moment = require('moment'); 
const serviceSchema = new mongoose.Schema({

    serviceType: {
        type: String,
        enum: ['VET', 'SHOP', 'HOTEL', 'TRAINING', 'FRIENDLY', 'GROOMING'],
        trim: true
    },

    serviceName: {
        type: String,
        required: true
    },

    location: {
        type: String,
    },

    openingTime: {
        type: String,
        required: true
    },

    closingTime: {
        type: String,
        required: true
    },

    offDay: {
        type: String,
        required: true
    },

    websiteLink: {
        type: String,
    },
    shopLogo: {
        type: String,
    },
    phone: {
        type: String,
    },
    providings: [{type: String}],

    //friendly places
    

    servicesImages: { type: String },

    bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],

    businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true, toJSON: { virtuals: true } });

serviceSchema.virtual('isOpenNow').get(function () {
    const now = moment();
    const today = now.format('dddd'); // e.g. "Monday"
  
    // If today is off day → closed
    if (this.offDay && this.offDay.toLowerCase() === today.toLowerCase()) {
      return false;
    }
  
    // Convert opening & closing times into today's date
    const opening = moment(this.openingTime, "HH:mm");
    const closing = moment(this.closingTime, "HH:mm");
  
    // Handle overnight businesses (e.g., 20:00 - 02:00)
    if (closing.isBefore(opening)) {
      return now.isAfter(opening) || now.isBefore(closing);
    }
  
    return now.isBetween(opening, closing);
  });

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;