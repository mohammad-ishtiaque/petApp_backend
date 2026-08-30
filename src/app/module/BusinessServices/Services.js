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
    latitude: {
        type: String,
    },
    longitude: {
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
        type: [String],
        default: [],
        set: function (val) {
            if (!val) return [];
            if (Array.isArray(val)) {
                return val.map(d => String(d).trim()).filter(Boolean);
            }
            if (typeof val === 'string') {
                if (val.trim().startsWith('[')) {
                    try {
                        const parsed = JSON.parse(val);
                        if (Array.isArray(parsed)) return parsed.map(d => String(d).trim()).filter(Boolean);
                    } catch (e) {}
                }
                return val.split(',').map(d => d.trim()).filter(Boolean);
            }
            return [];
        }
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
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true, toJSON: { virtuals: true } });

// Useful indexes
serviceSchema.index({ businessId: 1, serviceType: 1 }, { unique: true, partialFilterExpression: { businessId: { $exists: true } } });
serviceSchema.index({ businessId: 1 });

serviceSchema.virtual('isOpenNow').get(function () {
    const now = moment();
    const today = now.format('dddd'); // e.g. "Monday"
  
    // If today is off day → closed
    let offDays = [];
    if (Array.isArray(this.offDay)) {
        offDays = this.offDay.map(d => String(d).trim().toLowerCase());
    } else if (typeof this.offDay === 'string') {
        offDays = this.offDay.split(',').map(d => d.trim().toLowerCase());
    }

    if (offDays.includes(today.toLowerCase())) {
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