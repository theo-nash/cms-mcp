import { BrandService } from "../services/brand.service.js";
import { CampaignService } from "../services/campaign.service.js";
import { PlanService } from "../services/plan.service.js";
import { ContentService } from "../services/content.service.js";
import { PlanType, PlanState, MasterPlanUpdateParams, MicroPlanUpdateParams, MasterPlanCreationParams, MicroPlanCreationParams } from "../models/plan.model.js";
import { ContentState, ContentCreationParams, ContentUpdateParams } from "../models/content.model.js";
import { BrandUpdateParams } from "../models/brand.model.js";
import { CampaignCreationParams } from "../models/campaign.model.js";

// Initialize services
const brandService = new BrandService();
const campaignService = new CampaignService();
const planService = new PlanService();
const contentService = new ContentService();

export async function runTests() {
    console.log("Starting CRUD tests...");

    try {
        // Brand tests
        console.log("\n--- Testing Brand CRUD operations ---");
        const brand = await testBrandOperations();

        // Campaign tests (depends on Brand)
        console.log("\n--- Testing Campaign CRUD operations ---");
        const campaign = await testCampaignOperations(brand._id!);

        // Plan tests (depends on Campaign)
        console.log("\n--- Testing Plan CRUD operations ---");
        const masterPlan = await testMasterPlanOperations(campaign._id!);
        const microPlan = await testMicroPlanOperations(masterPlan._id!);

        // Content tests (depends on MicroPlan or Brand)
        console.log("\n--- Testing Content CRUD operations ---");
        await testContentOperations(microPlan._id!, brand._id!);

        console.log("\nAll tests completed successfully!");
    } catch (error) {
        console.error("Test failed:", error);
    }
}

async function testBrandOperations() {
    // Create a brand
    console.log("Creating brand...");
    const brand = await brandService.createBrand({
        name: `Test Brand ${Date.now()}`,
        description: "A test brand for CRUD operations",
        guidelines: {
            tone: ["Professional", "Friendly"],
            vocabulary: ["innovative", "solution"],
            avoidedTerms: ["problem", "failure"],
            visualIdentity: {
                primaryColor: "#FF5733",
                secondaryColor: "#33FF57"
            },
            narratives: {
                elevatorPitch: "We make great software",
                shortNarrative: "We make software that helps people",
                fullNarrative: "We are a company dedicated to creating software solutions..."
            },
            keyMessages: [
                { audienceSegment: "Developers", message: "Our tools make your job easier" },
                { audienceSegment: "Managers", message: "Our solutions improve productivity" }
            ]
        }
    });

    console.log(`Brand created with ID: ${brand._id}`);

    // Read the brand
    console.log("Reading brand...");
    const retrievedBrand = await brandService.getBrand(brand._id!);
    console.log(`Retrieved brand by ID: ${retrievedBrand?.name}`);

    // Read the brand by name
    console.log("Reading brand by name...");
    const retrievedBrandByName = await brandService.getBrandByName(brand.name);
    console.log(`Retrieved brand by name: ${retrievedBrandByName?.name}`);

    // Get all brands
    console.log("Getting all brands...");
    const allBrands = await brandService.getAllBrands();
    console.log(`Retrieved ${allBrands.length} brands`);


    // Update the brand
    console.log("Updating brand...");
    const updateData: BrandUpdateParams = {
        brandId: brand._id,
        guidelines: {
            tone: ["Professional", "Friendly", "Engaging"],
            vocabulary: ["innovative", "solution"],
            avoidedTerms: ["problem", "failure"],
            keyMessages: [
                { audienceSegment: "Executives", message: "Our platform provides actionable insights" }
            ]
        }
    };

    const updatedBrand = await brandService.updateBrand(updateData);

    console.log(`Updated brand tone: ${updatedBrand?.guidelines?.tone}`);
    console.log(`Brand has ${updatedBrand?.guidelines?.keyMessages?.length} key messages`);

    return brand;
}

async function testCampaignOperations(brandId: string) {
    // Create a campaign
    console.log("Creating campaign...");

    const campaignData: CampaignCreationParams = {
        brandId,
        name: `Test Campaign ${Date.now()}`,
        description: "A test campaign for CRUD operations",
        objectives: ["Increase awareness", "Generate leads"],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        goals: [
            {
                type: "Awareness",
                description: "Increase brand visibility",
                priority: 1,
                kpis: [
                    { metric: "Impressions", target: 10000 },
                    { metric: "Reach", target: 5000 }
                ],
                completionCriteria: "Achieve 90% of all KPI targets"
            }
        ],
        audience: [
            {
                segment: "Tech professionals",
                characteristics: ["25-45 years old", "Tech-savvy"],
                painPoints: ["Time constraints", "Information overload"]
            }
        ],
        contentMix: [
            {
                category: "Educational",
                ratio: 0.6,
                platforms: [
                    { name: "Twitter", format: "Threads" },
                    { name: "LinkedIn", format: "Articles" }
                ]
            }
        ],
        majorMilestones: [
            {
                date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                description: "Launch campaign",
                status: "pending"
            }
        ]
    }

    const campaign = await campaignService.createCampaign(campaignData);

    console.log(`Campaign created with ID: ${campaign._id}`);

    // Create campaign with brand name
    const { brandId: _, ...data } = campaignData;
    const brandName = await brandService.getBrand(brandId);
    const campaignWithBrandName = await campaignService.createCampaign({
        ...data,
        brandName: brandName?.name,
        name: `${brandName?.name} Campaign`
    });

    console.log(`Campaign created with ID: ${campaignWithBrandName._id}`);

    // Read the campaign
    console.log("Reading campaign...");
    const retrievedCampaign = await campaignService.getCampaignById(campaign._id!);
    console.log(`Retrieved campaign: ${retrievedCampaign?.name}`);

    // Read the campaign by name
    console.log("Reading campaign by name...");
    const retrievedCampaignByName = await campaignService.getCampaignByName(campaign.name);
    console.log(`Retrieved campaign by name: ${retrievedCampaignByName?.name}`);

    // Get all campaigns
    console.log("Getting all campaigns...");
    const allCampaigns = await campaignService.getAllCampaigns();
    console.log(`Retrieved ${allCampaigns.length} campaigns`);

    // Get campaigns by brand ID
    console.log("Getting campaigns by brand ID...");
    const campaignsByBrandId = await campaignService.getCampaignsByBrandId(brandId);
    console.log(`Retrieved ${campaignsByBrandId.length} campaigns by brand ID`);

    // Get active campaigns for a brand
    console.log("Getting active campaigns for a brand...");
    const activeCampaigns = await campaignService.getActiveCampaigns(brandId);
    console.log(`Retrieved ${activeCampaigns.length} active campaigns for a brand`);

    // Update the campaign
    console.log("Updating campaign...");
    const updatedCampaign = await campaignService.updateCampaign({
        campaign_id: campaign._id!,
        objectives: ["Increase awareness", "Generate leads", "Drive conversions"],
        majorMilestones: [
            {
                date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
                description: "Mid-campaign review",
                status: "pending"
            }
        ],
        stateMetadata: {
            updatedBy: "test-user",
            comments: "Added conversion objective and mid-campaign milestone"
        }
    });

    console.log(`Updated campaign objectives: ${updatedCampaign?.objectives}`);
    console.log(`Campaign has ${updatedCampaign?.majorMilestones?.length} milestones`);

    return campaign;
}

async function testMasterPlanOperations(campaignId: string) {
    // Create a master plan
    console.log("Creating master plan...");

    const masterPlanData: MasterPlanCreationParams = {
        campaignId,
        title: `Test Master Plan ${Date.now()}`,
        dateRange: {
            start: new Date(),
            end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        },
        goals: ["Establish brand voice", "Create consistent messaging"],
        targetAudience: "Tech professionals and decision makers",
        channels: ["Twitter", "LinkedIn", "Blog"],
        contentStrategy: {
            approach: "Educational content with focus on problem-solving",
            keyThemes: ["Innovation", "Efficiency", "Scalability"],
            distribution: { Twitter: 0.4, LinkedIn: 0.4, Blog: 0.2 }
        },
        timeline: [
            {
                date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                description: "Launch first content series",
                type: "Content Launch",
                status: "pending"
            }
        ]
    };

    const masterPlan = await planService.createMasterPlan(masterPlanData);

    console.log(`Master plan created with ID: ${masterPlan._id}`);

    // Create master plan with campaign name
    const { campaignId: _, ...data } = masterPlanData;
    const campaignName = await campaignService.getCampaignById(campaignId);
    const masterPlanWithCampaignName = await planService.createMasterPlan({
        ...data,
        campaignName: campaignName?.name,
    });

    console.log(`Master plan created with ID: ${masterPlanWithCampaignName._id}`);

    // Read the master plan
    console.log("Reading master plan...");
    const retrievedMasterPlan = await planService.getMasterPlanById(masterPlan._id!);
    console.log(`Retrieved master plan: ${retrievedMasterPlan?.title}`);

    // Read the master plan by name
    console.log("Reading master plan by name...");
    const retrievedMasterPlanByName = await planService.getMasterPlanByName(masterPlan.title);
    console.log(`Retrieved master plan by name: ${retrievedMasterPlanByName?.title}`);

    // Get all master plans
    console.log("Getting all master plans...");
    const allMasterPlans = await planService.getAllMasterPlansByCampaignId(campaignId);
    console.log(`Retrieved ${allMasterPlans.length} master plans`);

    // Get master plans by campaign ID
    console.log("Getting master plans by campaign ID...");
    const masterPlansByCampaignId = await planService.getMasterPlansByCampaignId(campaignId);
    console.log(`Retrieved ${masterPlansByCampaignId.length} master plans by campaign ID`);

    // Get active master plans
    console.log("Getting active master plans...");
    const activeMasterPlans = await planService.getActiveMasterPlan(campaignId);
    console.log(`Retrieved active master plans`);

    // Update the master plan
    console.log("Updating master plan...");
    const masterPlanUpdateData: any = {
        plan_id: masterPlan._id!,
        goals: ["Establish brand voice", "Create consistent messaging", "Drive engagement"],
        contentStrategy: {
            approach: "Educational content with focus on problem-solving",
            keyThemes: ["Innovation", "Efficiency", "Scalability", "Reliability"],
            distribution: { Twitter: 0.4, LinkedIn: 0.4, Blog: 0.2 }
        }
    };

    const updatedMasterPlan = await planService.updatePlan(masterPlanUpdateData);

    console.log(`Updated master plan goals: ${updatedMasterPlan?.goals}`);
    console.log(`Master plan content themes: ${(updatedMasterPlan as any)?.contentStrategy?.keyThemes}`);

    return masterPlan;
}

async function testMicroPlanOperations(masterPlanId: string) {
    // Create a micro plan
    console.log("Creating micro plan...");
    const microPlanData: MicroPlanCreationParams = {
        masterPlanId,
        title: `Test Micro Plan ${Date.now()}`,
        dateRange: {
            start: new Date(),
            end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
        },
        goals: ["Create a series of educational tweets"],
        targetAudience: "Tech professionals",
        channels: ["Twitter"],
        contentSeries: {
            name: "Tech Tips",
            description: "Short, actionable tech tips for developers",
            expectedPieces: 10,
            theme: "Developer Productivity"
        },
        performanceMetrics: [
            {
                metricName: "Engagement",
                target: 5000
            },
            {
                metricName: "Clicks",
                target: 500
            }
        ]
    };

    const microPlan = await planService.createMicroPlan(microPlanData);

    console.log(`Micro plan created with ID: ${microPlan._id}`);

    // Create micro plan with master plan name
    const { masterPlanId: _, ...data } = microPlanData;
    const masterPlanName = await planService.getMasterPlanById(masterPlanId);
    const microPlanWithMasterPlanName = await planService.createMicroPlan({
        ...data,
        masterPlanName: masterPlanName?.title
    });

    console.log(`Micro plan created with ID: ${microPlanWithMasterPlanName._id}`);

    // Read the micro plan
    console.log("Reading micro plan...");
    const retrievedMicroPlan = await planService.getPlan(microPlan._id!);
    console.log(`Retrieved micro plan: ${retrievedMicroPlan?.title}`);

    // Read the micro plan by name
    console.log("Reading micro plan by name...");
    const retrievedMicroPlanByName = await planService.getMicroPlanByName(microPlan.title);
    console.log(`Retrieved micro plan by name: ${retrievedMicroPlanByName?.title}`);

    // Get all micro plans  
    console.log("Getting all micro plans...");
    const allMicroPlans = await planService.getAllMicroPlansByMasterId(masterPlanId);
    console.log(`Retrieved ${allMicroPlans.length} micro plans`);

    // Get micro plans by master plan ID
    console.log("Getting micro plans by master plan ID...");
    const microPlansByMasterPlanId = await planService.getMicroPlansByMasterId(masterPlanId);
    console.log(`Retrieved ${microPlansByMasterPlanId.length} micro plans by master plan ID`);

    // Get active micro plans
    console.log("Getting active micro plans...");
    const activeMicroPlans = await planService.getActiveMicroPlans(masterPlanId);
    console.log(`Retrieved active micro plans`);

    // Get all plans
    console.log("Getting all plans...");
    const allPlans = await planService.getAllMicroPlansByMasterId(masterPlanId);
    console.log(`Retrieved ${allPlans.length} plans`);

    // Update the micro plan
    console.log("Updating micro plan...");
    const microPlanUpdateData: any = {
        plan_id: microPlan._id!,
        contentSeries: {
            name: "Tech Tips",
            description: "Short, actionable tech tips for developers",
            expectedPieces: 15,
            theme: "Developer Productivity & Workflow Optimization"
        }
    };

    const updatedMicroPlan = await planService.updatePlan(microPlanUpdateData);

    console.log(`Updated micro plan content series: ${(updatedMicroPlan as any)?.contentSeries?.theme}`);
    console.log(`Micro plan expected pieces: ${(updatedMicroPlan as any)?.contentSeries?.expectedPieces}`);

    return microPlan;
}

async function testContentOperations(microPlanId: string, brandId: string) {
    // Create content with micro plan
    console.log("Creating content with micro plan...");
    const contentWithPlanData: any = {
        microPlanId,
        title: `Test Content with Plan ${Date.now()}`,
        content: "This is test content associated with a micro plan.",
        format: "Tweet",
        platform: "Twitter",
        targetAudience: "Developers",
        keywords: ["productivity", "tips"],
        mediaRequirements: {
            type: "Image",
            description: "Simple diagram showing workflow improvement"
        }
    };

    const contentWithPlan = await contentService.createContent(contentWithPlanData);

    console.log(`Content with plan created with ID: ${contentWithPlan._id}`);

    // Create standalone content with brand
    console.log("Creating standalone content with brand...");
    const standaloneContentData: ContentCreationParams = {
        brandId,
        title: `Standalone Test Content ${Date.now()}`,
        content: "This is standalone test content associated directly with a brand.",
        format: "Article",
        platform: "Blog",
        targetAudience: "Decision makers",
        keywords: ["innovation", "solution"]
    };

    const standaloneContent = await contentService.createContent(standaloneContentData);

    console.log(`Standalone content created with ID: ${standaloneContent._id}`);


    // Read content
    console.log("Reading content...");
    const retrievedContent = await contentService.getContent(contentWithPlan._id!);
    console.log(`Retrieved content: ${retrievedContent?.title}`);

    // Read content by brand ID
    console.log("Reading content by brand ID...");
    const retrievedContentByBrandId = await contentService.getContentByBrandId(brandId);
    console.log(`Retrieved ${retrievedContentByBrandId.length} content by brand ID`);

    // Get all content
    console.log("Getting all content...");
    const allContent = await contentService.getAllContent();
    console.log(`Retrieved ${allContent.length} content`);

    // Get content by micro plan ID     
    console.log("Getting content by micro plan ID...");
    const contentByMicroPlanId = await contentService.getContentByMicroPlanId(microPlanId);
    console.log(`Retrieved ${contentByMicroPlanId.length} content by micro plan ID`);


    // Update content
    console.log("Updating content...");
    const updateContentData: any = {
        content_id: contentWithPlan._id!,
        title: contentWithPlan.title,
        content: "This is updated test content associated with a micro plan.",
        keywords: ["productivity", "tips", "efficiency"]
    };

    const updatedContent = await contentService.updateContent(updateContentData);

    console.log(`Updated content: ${updatedContent?.content}`);
    console.log(`Content keywords: ${updatedContent?.keywords}`);

    // Transition content state
    console.log("Transitioning content state...");
    const readyContent = await contentService.transitionContentState(
        contentWithPlan._id!,
        ContentState.Ready,
        { userId: "test-user", comments: "Content reviewed and ready for publishing" }
    );

    console.log(`Content state updated to: ${readyContent?.state}`);

    // Schedule content
    console.log("Scheduling content...");
    const scheduledContent = await contentService.scheduleContent(
        contentWithPlan._id!,
        new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
        "test-user"
    );

    console.log(`Content scheduled to: ${scheduledContent?.stateMetadata?.scheduledFor}`);

    // Now change the state to published
    console.log("Changing content state to published...");
    const publishedContent = await contentService.transitionContentState(
        contentWithPlan._id!,
        ContentState.Published,
        { userId: "test-user", comments: "Content published" }
    );

    return { contentWithPlan, standaloneContent };
}

// Run the tests
runTests().catch(console.error); 