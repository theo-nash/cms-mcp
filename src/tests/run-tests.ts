import { connectToDatabase } from "../config/db.js";

// Connect to database and run tests
async function run() {
    try {
        console.log("Connecting to database...");
        await connectToDatabase();

        // Import and run tests
        const { runTests } = await import("./main.test.js");
        await runTests();

        console.log("Tests completed, exiting...");
        process.exit(0);
    } catch (error) {
        console.error("Test runner failed:", error);
        process.exit(1);
    }
}

run(); 