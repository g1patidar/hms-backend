require('dotenv').config();
const mongoose = require('mongoose');
const { User, Hospital } = require('./src/models');

async function debug() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hms');

    const users = await User.find().select('email hospitalId').lean();
    console.log('=== USERS ===');
    users.forEach(u => {
        console.log(`Email: ${u.email}`);
        console.log(`HospitalId: ${u.hospitalId}`);
        console.log('---');
    });

    const hospitals = await Hospital.find().lean();
    console.log('\n=== HOSPITALS ===');
    hospitals.forEach(h => {
        console.log(`ID: ${h._id}`);
        console.log(`Name: ${h.name}`);
        console.log(`Wards count: ${h.wards?.length || 0}`);
        if (h.wards && h.wards.length > 0) {
            console.log('Wards:');
            h.wards.forEach(w => console.log(`  - ${w.name}: ${w.currentOccupancy}/${w.capacity}`));
        }
        console.log('---');
    });

    process.exit(0);
}

debug().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
