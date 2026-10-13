const mongoose = require('mongoose');

const initData = require('./data.js');
const Listing = require('../models/listing.js');

async function initDB() {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/wanderlust');
        console.log('Connected to MongoDB');

        // Delete old listings
        await Listing.deleteMany({});
        console.log('Existing listings deleted.');

        // Insert seed data
        await Listing.insertMany(initData.data);
        console.log('Initial data inserted.');

        // Update old placeholder image URLs
        await Listing.updateMany(
            { 'image.url': /via.placeholder.com/ },
            { $set: { 'image.url': 'https://placehold.co/150?text=No+Image' } }
        );

        console.log('Image URLs updated.');

    } catch (error) {
        console.error('Error initializing database:', error);
    } finally {
        // Close MongoDB connection
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
    }
}

initDB();