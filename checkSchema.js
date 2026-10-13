const mongoose = require("mongoose");
const Listing = require("./models/listing");

mongoose.connect("mongodb://127.0.0.1:27017/wanderlust")  // ← change to your db name
  .then(() => {
    console.log("Connected");

    // List every path declared in the schema
    console.log("\n=== Schema paths ===");
    Object.keys(Listing.schema.paths).forEach(p => console.log(" -", p));

    // Does "owner" exist in the schema?
    console.log("\n=== Has owner path? ===");
    console.log(Listing.schema.path("owner") ? "YES ✅" : "NO ❌ — this is the bug");

    // What type is it?
    const ownerPath = Listing.schema.path("owner");
    if (ownerPath) {
      console.log("owner type:", ownerPath.instance);
      console.log("owner options:", ownerPath.options);
    }

    mongoose.connection.close();
  })
  .catch(err => { console.error(err); process.exit(1); });