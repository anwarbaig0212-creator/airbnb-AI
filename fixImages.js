// fixImages.js
const mongoose = require('mongoose');
const Listing = require('./models/listing');

const MONGO_URL = 'mongodb://localhost:27017/wanderlust'; // 👈 use your actual DB URL

async function main() {
  await mongoose.connect(MONGO_URL);
  console.log('Connected to DB');

  const result = await Listing.updateMany(
    { images: /via\.placeholder\.com/ },
    { $set: { images: 'https://placehold.co/150?text=No+Image' } }
  );

  console.log(`Updated ${result.modifiedCount} listings`);
  await mongoose.connection.close();
}

main().catch(err => console.log(err));