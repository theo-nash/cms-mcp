import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// MongoDB connection URI
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/cms-mcp";

// MongoDB client
let client: MongoClient;
let db: Db;

/**
 * Connect to MongoDB
 */
export async function connectToDatabase(): Promise<Db> {
    if (db) return db;

    try {
        client = new MongoClient(uri);
        await client.connect();

        db = client.db();
        console.log("Connected to MongoDB");

        return db;
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error);
        throw error;
    }
}

/**
 * Get the database instance
 */
export function getDatabase(): Db {
    if (!db) {
        throw new Error("Database not connected. Call connectToDatabase() first.");
    }
    return db;
}