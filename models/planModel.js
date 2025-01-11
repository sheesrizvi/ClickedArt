const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
    name: {
        type: String,
        enum: ['Basic', 'Intermediate', 'Premium'],
        required: true
    },
    cost: [{
      price: {
          type: Number,
          required: true
      },
      duration: {
          type: String,
          enum: ['monthly', 'yearly'],
          required: true
      }
  }],
    imageUploadLimit: {
        type: Number,
        required: true
    },
    catalogCreation: {
        type: Number,
        required: true
    },
    watermarkingTools: {
        type: String,
        enum: ['Basic watermark', 'Custom watermark', 'Advanced watermark and branding options'],
        required: true
    },
    salesReports: {
        type: String,
        enum: ['Simple monthly report', 'Detailed sales analytics', 'Advanced analytics with customer insights'],
        required: true
    },
    customPricing: {
        type: Boolean,
        required: true
    },
    licensingOptions: {
        type: String,
        enum: ['Fixed licensing only', 'Flexible licensing (commercial, personal)', 'Full licensing customization'],
        required: true
    },
    socialMediaIntegration: {
        type: String,
        enum: ['Limited to sharing', 'Full integration (auto-posting tools)', 'Enhanced social media and website embeds'],
        required: true
    },
    socialMediaAutoPosting: {
        type: String,
        enum: ['Not Available', 'Single-platform posting', 'Multi-platform posting with scheduling'],
        required: true
    },
    prioritySupport: {
        type: String,
        enum: ['Not Available', 'Standard (24-48 hrs response)', 'Premium (12-24 hrs response, dedicated)'],
        required: true
    },
    advancedTools: {
        type: String,
        enum: ['Not Available', 'Limited templates', 'Full customization and analytics dashboard'],
        required: true
    },
    promotionalTools: {
        type: String,
        enum: ['No promotions', 'Seasonal promotions', 'Full promotional toolkit (coupons, discounts)'],
        required: true
    },
    trialPeriod: {
        type: String,
        enum: ['Not applicable', 'Free for the first 1 month'],
        required: true
    }
}, { timestamps: true });

const Plan = mongoose.model('Plan', planSchema);

module.exports = Plan;

