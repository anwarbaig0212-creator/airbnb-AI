const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const listingSchema = new Schema(
  {
    // ---------- Core identity ----------
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },

    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [20, 'Description must be at least 20 characters'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },

    // ---------- Location ----------
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },

    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
    },

    // ---------- Pricing ----------
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },

    // ---------- Capacity (needed for bookings + AI search later) ----------
    guests: {
      type: Number,
      required: true,
      min: [1, 'Must allow at least 1 guest'],
      default: 2,
    },

    bedrooms: {
      type: Number,
      required: true,
      min: [0, 'Bedrooms cannot be negative'],
      default: 1,
    },

    beds: {
      type: Number,
      required: true,
      min: [1, 'At least 1 bed required'],
      default: 1,
    },

    bathrooms: {
      type: Number,
      required: true,
      min: [0, 'Bathrooms cannot be negative'],
      default: 1,
    },

    // ---------- Type & features (needed for AI description generator) ----------
    propertyType: {
      type: String,
      required: true,
      enum: {
        values: ['Apartment', 'House', 'Villa', 'Cabin', 'Cottage', 'Hotel', 'Hostel', 'Treehouse', 'Other'],
        message: '{VALUE} is not a supported property type',
      },
      default: 'Apartment',
    },

    amenities: {
      type: [String],
      default: [],
    },

    nearbyAttractions: {
      type: [String],
      default: [],
    },

    // AI will suggest these tags later (Phase 2) — kept empty for now
    tags: {
      type: [String],
      default: [],
    },

    // ---------- Image (standardized to object form) ----------
    image: {
      url: {
        type: String,
        default:
          'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=60',
      },
      filename: {
        type: String,
        default: 'listingimage',
      },
    },

    // ---------- Relationships (populated in later phases) ----------
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review', // Review model comes in Phase 1 (later step)
      },
    ],

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // User model comes in Phase 1 (auth step)
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt automatically
  }
);

const Listing = mongoose.model('Listing', listingSchema);
module.exports = Listing;