// resetDatabase.ts
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// MongoDB connection URI from environment or use default
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/cms-mcp";

async function resetDatabase() {
    console.log('Starting database reset process...');
    console.log(`Connecting to database: ${uri}`);

    const client = new MongoClient(uri);

    try {
        // Connect to MongoDB
        await client.connect();
        console.log('Connected to MongoDB successfully');

        // Get database name from URI
        const dbName = uri.split('/').pop()?.split('?')[0] || 'cms-mcp';
        const db = client.db(dbName);

        // Get all collections
        const collections = await db.listCollections().toArray();

        if (collections.length === 0) {
            console.log('No collections found in the database. Nothing to reset.');
        } else {
            console.log(`Found ${collections.length} collections to drop:`);

            // Drop each collection
            for (const collection of collections) {
                console.log(`Dropping collection: ${collection.name}...`);
                await db.collection(collection.name).drop();
                console.log(`Collection ${collection.name} dropped successfully`);
            }

            console.log('All collections have been dropped successfully');
        }

        console.log('Database reset completed successfully');

        // Optional: Recreate empty collections with proper indexes
        // Uncomment the following section if you want to recreate empty collections
        /*
        console.log('Recreating empty collections...');
        
        // Create brands collection
        await db.createCollection('brands');
        console.log('Created brands collection');
        
        // Create campaigns collection
        await db.createCollection('campaigns');
        console.log('Created campaigns collection');
        
        // Create plans collection
        await db.createCollection('plans');
        console.log('Created plans collection');
        
        // Create contents collection
        await db.createCollection('contents');
        console.log('Created contents collection');
        
        console.log('All collections have been recreated successfully');
        */

    } catch (error) {
        console.error('An error occurred during database reset:', error);
    } finally {
        // Close the connection
        await client.close();
        console.log('Database connection closed');
    }
}

// Run the reset function
resetDatabase()
    .then(() => console.log('Database reset script completed'))
    .catch(err => console.error('Database reset script failed:', err));