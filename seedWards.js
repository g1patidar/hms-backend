/**
 * Seed script for Ward data
 * Creates sample wards in the Hospital schema
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Hospital = require('./src/models/Hospital');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hms';

// Sample ward data
const sampleWards = [
    {
        name: 'General',
        type: 'General',
        capacity: 180,
        currentOccupancy: 145,
    },
    {
        name: 'ICU',
        type: 'ICU',
        capacity: 35,
        currentOccupancy: 28,
    },
    {
        name: 'Pediatric',
        type: 'Pediatric',
        capacity: 80,
        currentOccupancy: 62,
    },
    {
        name: 'Maternity',
        type: 'Maternity',
        capacity: 50,
        currentOccupancy: 41,
    },
    {
        name: 'Emergency',
        type: 'Emergency',
        capacity: 40,
        currentOccupancy: 19,
    },
];

async function seedWards() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get the first hospital from the database
        const hospital = await Hospital.findOne();

        if (!hospital) {
            console.error('No hospital found in database. Please create a hospital first.');
            process.exit(1);
        }

        console.log(`Using hospital: ${hospital.name} (${hospital._id})`);

        // Clear existing wards
        hospital.wards = [];

        // Add new wards
        hospital.wards.push(...sampleWards);
        await hospital.save();

        console.log(`Created ${hospital.wards.length} wards:`);
        hospital.wards.forEach(ward => {
            console.log(`  - ${ward.name}: ${ward.currentOccupancy}/${ward.capacity} beds`);
        });

        console.log('\nWard seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding wards:', error);
        process.exit(1);
    }
}

seedWards();
