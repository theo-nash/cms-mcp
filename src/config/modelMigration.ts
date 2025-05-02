import { connectToDatabase } from "./db.js";

async function migrateContentAndPlans() {
    const db = await connectToDatabase();

    // Content migration
    const contents = db.collection("contents");
    const contentDefaultVersion = 1;
    const contentDefaultIsActive = true;
    const contentDefaultBrandId = "68139b51640185852eae7567"

    const contentVersionResult = await contents.updateMany(
        { version: { $exists: false } },
        { $set: { version: contentDefaultVersion } }
    );
    const contentIsActiveResult = await contents.updateMany(
        { $or: [{ isActive: { $exists: false } }, { isActive: { $ne: true } }] },
        { $set: { isActive: contentDefaultIsActive } }
    );
    const contentBrandIdResult = await contents.updateMany(
        { brandId: { $exists: false } },
        { $set: { brandId: contentDefaultBrandId } }
    );

    // Plans migration
    const plans = db.collection("plans");
    const planDefaultVersion = 1;
    const planDefaultIsActive = true;

    // For plans, version is inside stateMetadata.version
    const planVersionResult = await plans.updateMany(
        { "stateMetadata.version": { $exists: false } },
        { $set: { "stateMetadata.version": planDefaultVersion } }
    );
    const planIsActiveResult = await plans.updateMany(
        { $or: [{ isActive: { $exists: false } }, { isActive: { $ne: true } }] },
        { $set: { isActive: planDefaultIsActive } }
    );

    console.log(`Migration complete.
    Content: updated ${contentVersionResult.modifiedCount} with version, ${contentIsActiveResult.modifiedCount} with isActive.
    Plans: updated ${planVersionResult.modifiedCount} with stateMetadata.version, ${planIsActiveResult.modifiedCount} with isActive.`);
}

migrateContentAndPlans()
    .then(() => process.exit(0))
    .catch(err => {
        console.error("Migration failed:", err);
        process.exit(1);
    });

async function migrateCampaigns() {
    const db = await connectToDatabase();
    const campaigns = db.collection("campaigns");

    // Set default values
    const defaultVersion = 1;
    const defaultIsActive = true;

    // Update documents missing 'version'
    const versionResult = await campaigns.updateMany(
        { version: { $exists: false } },
        { $set: { version: defaultVersion } }
    );

    // Update documents missing 'isActive'
    const isActiveResult = await campaigns.updateMany(
        { isActive: { $exists: false } },
        { $set: { isActive: defaultIsActive } }
    );

    console.log(`Migration complete.
    Updated ${versionResult.modifiedCount} documents with default version.
    Updated ${isActiveResult.modifiedCount} documents with default isActive.`);
}

migrateCampaigns()
    .then(() => process.exit(0))
    .catch(err => {
        console.error("Migration failed:", err);
        process.exit(1);
    });