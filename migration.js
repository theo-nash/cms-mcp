// migration.js
import { MongoClient } from 'mongodb';

// Replace with your actual MongoDB connection string
const uri = 'mongodb://localhost:27017';
const dbName = 'cms-mcp';

async function runMigration() {
  console.log('Starting database migration...');
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    
    // 1. Migrate Brands - Add missing nested objects in guidelines
    const brandsResult = await db.collection('brands').updateMany(
      { 
        $or: [
          { 'guidelines.visualIdentity': { $exists: false } },
          { 'guidelines.visualIdentity': null }
        ]
      },
      { 
        $set: { 'guidelines.visualIdentity': {} } 
      }
    );
    
    console.log(`Updated ${brandsResult.modifiedCount} brands with missing visualIdentity`);
    
    // Add missing narratives
    const narrativesResult = await db.collection('brands').updateMany(
      { 
        $or: [
          { 'guidelines.narratives': { $exists: false } },
          { 'guidelines.narratives': null }
        ]
      },
      { 
        $set: { 'guidelines.narratives': {} } 
      }
    );
    
    console.log(`Updated ${narrativesResult.modifiedCount} brands with missing narratives`);
    
    // Add missing keyMessages
    const keyMessagesResult = await db.collection('brands').updateMany(
      { 
        $or: [
          { 'guidelines.keyMessages': { $exists: false } },
          { 'guidelines.keyMessages': null }
        ]
      },
      { 
        $set: { 'guidelines.keyMessages': [] } 
      }
    );
    
    console.log(`Updated ${keyMessagesResult.modifiedCount} brands with missing keyMessages`);
    
    // 2. Migrate Plans - Add missing masterPlanId
    const plansResult = await db.collection('plans').updateMany(
      { 
        masterPlanId: { $exists: false } 
      },
      { 
        $set: { masterPlanId: '' } // Empty string or other default value
      }
    );
    
    console.log(`Updated ${plansResult.modifiedCount} plans with missing masterPlanId`);
    
    // 3. Migrate Content - Add missing microPlanId
    const contentResult = await db.collection('content').updateMany(
      { 
        microPlanId: { $exists: false } 
      },
      { 
        $set: { microPlanId: '' } // Empty string or other default value
      }
    );

const contentItems = await db.collection('content').find({}).toArray();
const contentPromises = contentItems.map(item => {
  // Ensure microPlanId exists on every single record
  if (!item.microPlanId) {
    return db.collection('content').updateOne(
      { _id: item._id },
      { $set: { microPlanId: '' } }
    );
  }
  return Promise.resolve();
});

await Promise.all(contentPromises);
console.log('Content migration completed');
    
    console.log(`Updated ${contentResult.modifiedCount} content items with missing microPlanId`);
    
    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.close();
    console.log('Database connection closed');
  }
}

runMigration().catch(console.error);