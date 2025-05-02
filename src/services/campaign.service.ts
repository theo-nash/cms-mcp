import { Campaign, CampaignCreationParams, CampaignCreationSchemaParser, CampaignStatus, CampaignUpdateParams } from "../models/campaign.model.js";
import { CampaignRepository } from "../repositories/campaign.repository.js";
import { BrandRepository } from "../repositories/brand.repository.js";
import { deepMerge, deepMergeArrays } from "../utils/merge.js";
import { Brand } from "../models/brand.model.js";

export interface StateTransitionMetadata {
  userId: string;
  comments?: string;
}

export class CampaignService {
  private campaignRepository: CampaignRepository;
  private brandRepository: BrandRepository;

  constructor() {
    this.campaignRepository = new CampaignRepository();
    this.brandRepository = new BrandRepository();
  }

  /**
   * Create a new campaign
   */
  async createCampaign(data: CampaignCreationParams): Promise<Campaign> {
    data = CampaignCreationSchemaParser.parse(data);

    let brand: Brand | null = null;

    // Verify brand exists
    if (data.brandId) {
      brand = await this.brandRepository.findById(data.brandId);
      if (!brand) {
        throw new Error(`Brand with ID ${data.brandId} not found`);
      }
    } else if (data.brandName) {
      brand = await this.brandRepository.findByName(data.brandName);
      if (!brand) {
        throw new Error(`Brand with name ${data.brandName} not found`);
      }
    }

    if (!brand) {
      throw new Error("Either brandId or brandName must be provided");
    }

    // Check if campaign with same name already exists
    const existingCampaign = await this.campaignRepository.findByName(data.name);
    if (existingCampaign) {
      throw new Error(`Campaign with name "${data.name}" already exists`);
    }

    // Create state metadata
    const stateMetadata = {
      updatedBy: "system",
      comments: ""
    };

    // Create the campaign
    return await this.campaignRepository.create({
      ...data,
      brandId: brand._id!,
      status: CampaignStatus.Draft,
      stateMetadata,
      // Add versioning fields
      version: 1,
      isActive: true,
      previousVersionId: undefined,
      rootCampaignId: undefined
    });
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(id: string): Promise<Campaign | null> {
    // First try to find by direct ID
    const campaign = await this.campaignRepository.findById(id);

    // If not found or if it's an active version, return it
    if (!campaign || campaign.isActive) {
      return campaign;
    }

    // If it's not active, find the active version with the same root
    return await this.campaignRepository.findActiveVersionByRoot(
      campaign.rootCampaignId || campaign._id!
    );
  }

  /**
   * Get campaign by name
   */
  async getCampaignByName(name: string): Promise<Campaign | null> {
    return await this.campaignRepository.findByName(name);
  }

  /**
   * Get all campaigns
   */
  async getAllCampaigns(activeOnly: boolean = true): Promise<Campaign[]> {
    return await this.campaignRepository.find({}, activeOnly);
  }

  /**
   * Get campaigns by brand ID
   */
  async getCampaignsByBrandId(brandId: string): Promise<Campaign[]> {
    return await this.campaignRepository.findByBrandId(brandId);
  }

  /**
   * Get active campaigns for a brand
   */
  async getActiveCampaigns(brandId: string): Promise<Campaign[]> {
    return await this.campaignRepository.findActiveCampaigns(brandId);
  }

  /**
   * Update campaign
   */
  async updateCampaign(updates: CampaignUpdateParams): Promise<Campaign | null> {
    // Get current campaign
    const campaign = await this.campaignRepository.findById(updates.campaign_id);
    if (!campaign) return null;

    // Check if we should create a new version or update in place
    if (updates.create_new_version) {
      return await this.createNewVersion(campaign, updates);
    }

    // Process updates to handle nested objects
    const processedUpdates: Record<string, any> = { ...updates };

    // Update state metadata
    const stateMetadata = deepMerge(
      campaign.stateMetadata || {
        updatedBy: updates.stateMetadata?.updatedBy || "system",
        comments: updates.stateMetadata?.comments || ""
      },
      {
        updatedBy: updates.stateMetadata?.updatedBy || "system",
        comments: updates.stateMetadata?.comments || ""
      }
    );

    processedUpdates.stateMetadata = stateMetadata;

    // Handle goals array if present
    if (updates.goals && campaign.goals) {
      // Merge goals by type (assuming type is unique)
      processedUpdates.goals = deepMergeArrays(
        campaign.goals,
        updates.goals,
        'type'
      );
    }

    // Handle audience array if present
    if (updates.audience && campaign.audience) {
      // Merge audience by segment (assuming segment is unique)
      processedUpdates.audience = deepMergeArrays(
        campaign.audience,
        updates.audience,
        'segment'
      );
    }

    // Handle contentMix array if present
    if (updates.contentMix && campaign.contentMix) {
      // Merge contentMix by category (assuming category is unique)
      processedUpdates.contentMix = deepMergeArrays(
        campaign.contentMix,
        updates.contentMix,
        'category'
      );
    }

    // Handle majorMilestones array if present
    if (updates.majorMilestones && campaign.majorMilestones) {
      // Merge milestones by description (since dates might change)
      processedUpdates.majorMilestones = deepMergeArrays(
        campaign.majorMilestones,
        updates.majorMilestones,
        'description'
      );
    }

    // Handle status updates
    if (updates.status && campaign.status) {
      this.validateStatusTransition(
        campaign.status as CampaignStatus,
        updates.status as CampaignStatus
      );
      processedUpdates.status = updates.status;

      // Set to active if status is active
      if (updates.status === CampaignStatus.Active) {
        processedUpdates.isActive = true;
      } else {
        processedUpdates.isActive = false;
      }
    }

    // Apply updates
    return await this.campaignRepository.update(updates.campaign_id, processedUpdates);
  }

  /**
   * Create a new version of a campaign
   */
  private async createNewVersion(existingCampaign: Campaign, updates: CampaignUpdateParams): Promise<Campaign> {
    // Strip non-campaign data fields from updates
    const { campaign_id, create_new_version, ...campaignUpdates } = updates;

    // Process updates to handle nested objects
    const processedUpdates: Record<string, any> = { ...campaignUpdates };

    // Update state metadata
    const stateMetadata = deepMerge(
      existingCampaign.stateMetadata || {
        updatedAt: new Date(),
        updatedBy: updates.stateMetadata?.updatedBy || "system",
        comments: updates.stateMetadata?.comments || ""
      },
      {
        updatedAt: new Date(),
        updatedBy: updates.stateMetadata?.updatedBy || "system",
        comments: updates.stateMetadata?.comments || `Created new version ${existingCampaign.version + 1}`
      }
    );

    processedUpdates.stateMetadata = stateMetadata;

    // Handle goals array if present
    if (updates.goals && existingCampaign.goals) {
      processedUpdates.goals = deepMergeArrays(
        existingCampaign.goals,
        updates.goals,
        'type'
      );
    }

    // Handle audience array if present
    if (updates.audience && existingCampaign.audience) {
      processedUpdates.audience = deepMergeArrays(
        existingCampaign.audience,
        updates.audience,
        'segment'
      );
    }

    // Handle contentMix array if present
    if (updates.contentMix && existingCampaign.contentMix) {
      processedUpdates.contentMix = deepMergeArrays(
        existingCampaign.contentMix,
        updates.contentMix,
        'category'
      );
    }

    // Handle majorMilestones array if present
    if (updates.majorMilestones && existingCampaign.majorMilestones) {
      processedUpdates.majorMilestones = deepMergeArrays(
        existingCampaign.majorMilestones,
        updates.majorMilestones,
        'description'
      );
    }

    // Prepare new version data:
    // 1. It gets a new _id (assigned by MongoDB)
    // 2. Increment version number
    // 3. Set previously active version's isActive to false
    // 4. Save reference to previous version
    // 5. Keep reference to root version if it exists, otherwise use existing campaign ID

    const newVersionData = {
      ...existingCampaign,
      ...processedUpdates,
      version: existingCampaign.version + 1,
      isActive: true,
      previousVersionId: existingCampaign._id,
      rootCampaignId: existingCampaign.rootCampaignId || existingCampaign._id,
      updated_at: new Date()
    };

    // Create the new version
    const newVersion = await this.campaignRepository.create(newVersionData);

    // Set the previous version as inactive
    await this.campaignRepository.update(existingCampaign._id!, {
      isActive: false
    });

    return newVersion;
  }

  /**
   * Get all versions of a campaign
   */
  async getAllCampaignVersions(campaignId: string): Promise<Campaign[]> {
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) return [];

    // Find the root campaign ID
    const rootId = campaign.rootCampaignId || campaign._id!;

    // Get all versions with this root
    return await this.campaignRepository.findAllVersionsByRoot(rootId);
  }

  /**
   * Get specific version of campaign
   */
  async getCampaignVersion(campaignId: string, version: number): Promise<Campaign | null> {
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) return null;

    // Find the root campaign ID
    const rootId = campaign.rootCampaignId || campaign._id!;

    // Find campaign with the same root and the specified version
    return await this.campaignRepository.findVersionByRoot(rootId, version);
  }

  /**
   * Activate a specific version of campaign
   */
  async activateCampaignVersion(campaignId: string, userId: string): Promise<Campaign | null> {
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) return null;

    // If already active, just return it
    if (campaign.isActive) return campaign;

    // Find the root campaign ID
    const rootId = campaign.rootCampaignId || campaign._id!;

    // Deactivate all versions with the same root
    await this.campaignRepository.deactivateAllVersionsByRoot(rootId);

    // Activate the specified version
    return await this.campaignRepository.update(campaignId, {
      isActive: true,
      stateMetadata: {
        ...campaign.stateMetadata,
        updatedBy: userId,
        comments: `Activated version ${campaign.version}`
      }
    });
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(id: string): Promise<boolean> {
    return await this.campaignRepository.delete(id);
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(currentStatus: CampaignStatus, targetStatus: CampaignStatus): void {
    // Define valid transitions
    const validTransitions: Record<CampaignStatus, CampaignStatus[]> = {
      [CampaignStatus.Draft]: [CampaignStatus.Active],
      [CampaignStatus.Active]: [CampaignStatus.Completed, CampaignStatus.Archived],
      [CampaignStatus.Completed]: [CampaignStatus.Archived],
      [CampaignStatus.Archived]: [] // Terminal state
    };

    // Check if transition is valid
    if (!validTransitions[currentStatus].includes(targetStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${targetStatus}`);
    }
  }

  /**
   * Update a single milestone's status
   */
  async updateMilestoneStatus(
    campaignId: string,
    milestoneIndex: number,
    status: 'pending' | 'completed',
    userId: string
  ): Promise<Campaign | null> {
    // Get the campaign
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign || !campaign.majorMilestones || !campaign.majorMilestones[milestoneIndex]) {
      return null;
    }

    // Create a copy of the milestones array
    const majorMilestones = [...campaign.majorMilestones];

    // Update the specific milestone
    majorMilestones[milestoneIndex] = {
      ...majorMilestones[milestoneIndex],
      status
    };

    // Update the campaign
    return await this.updateCampaign({
      campaign_id: campaignId,
      majorMilestones,
      create_new_version: false // Don't create a new version for milestone updates
    });
  }

  async getCampaignsWithUpcomingMilestones(daysAhead: number = 7): Promise<Campaign[]> {
    return await this.campaignRepository.findByUpcomingMilestones(daysAhead);
  }
}
