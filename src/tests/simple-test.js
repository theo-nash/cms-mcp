import { connectToDatabase } from "../config/db.js";
import { BrandService } from "../services/brand.service.js";
import { PlanType, PlanState } from "../models/plan.model.js";
import { ContentState } from "../models/content.model.js";

// Initialize services
const brandService = new BrandService();

async function runSimpleTest() {
  try {
    console.log("Connecting to database...");
    await connectToDatabase();
    
    console.log("Testing brand creation...");
    const brand = await brandService.createBrand({
      name: `Test Brand ${Date.now()}`,
      description: "A test brand for CRUD operations",
      guidelines: {
        tone: ["Professional", "Friendly"],
        vocabulary: ["innovative", "solution"],
        avoidedTerms: ["problem", "failure"]
      }
    });
    
    console.log(`Brand created with ID: ${brand._id}`);
    
    // Read the brand
    console.log("Reading brand...");
    const retrievedBrand = await brandService.getBrand(brand._id);
    console.log(`Retrieved brand: ${retrievedBrand?.name}`);
    
    // Update the brand
    console.log("Updating brand...");
    const updatedBrand = await brandService.updateBrand(brand._id, {
      brandId: brand._id,
      guidelines: {
        tone: ["Professional", "Friendly", "Engaging"],
        vocabulary: ["innovative", "solution"],
        avoidedTerms: ["problem", "failure"],
        keyMessages: [
          { audienceSegment: "Executives", message: "Our platform provides actionable insights" }
        ]
      }
    });
    
    console.log(`Updated brand tone: ${updatedBrand?.guidelines?.tone}`);
    console.log(`Brand has ${updatedBrand?.guidelines?.keyMessages?.length} key messages`);
    
    console.log("Test completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

// Run the test
runSimpleTest(); 