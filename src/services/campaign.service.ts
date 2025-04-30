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

    const userId = "system-user";

    // Create state metadata
    const stateMetadata = {
      updatedAt: new Date(),
      updatedBy: userId,
      comments: ""
    };

    // Create the campaign
    return await this.campaignRepository.create({
      ...data,
      brandId: brand._id!,
      status: CampaignStatus.Draft,
      stateMetadata
    });
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(id: string): Promise<Campaign | null> {
    return await this.campaignRepository.findById(id);
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
  async getAllCampaigns(): Promise<Campaign[]> {
    return await this.campaignRepository.find({});
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

    // Process updates to handle nested objects
    const processedUpdates: Record<string, any> = { ...updates };

    // Update state metadata
    const stateMetadata = deepMerge(
      campaign.stateMetadata || {
        updatedAt: new Date(),
        updatedBy: updates.stateMetadata?.updatedBy || "system",
        comments: updates.stateMetadata?.comments || ""
      },
      {
        updatedAt: new Date(),
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

    // Apply updates
    return await this.campaignRepository.update(updates.campaign_id, processedUpdates);
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
    return await this.updateCampaign({ campaign_id: campaignId, majorMilestones });
  }

  async getCampaignsWithUpcomingMilestones(daysAhead: number = 7): Promise<Campaign[]> {
    return await this.campaignRepository.findByUpcomingMilestones(daysAhead);
  }
}
