import { Campaign, CampaignStatus } from "../models/campaign.model.js";
import { CampaignRepository } from "../repositories/campaign.repository.js";
import { BrandRepository } from "../repositories/brand.repository.js";
export interface CampaignCreationData {
  brandId: string;
  name: string;
  description?: string;
  objectives?: string[];
  startDate: Date;
  endDate: Date;
  userId?: string;
}

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
  async createCampaign(data: CampaignCreationData): Promise<Campaign> {
    // Verify brand exists
    const brand = await this.brandRepository.findById(data.brandId);
    if (!brand) {
      throw new Error(`Brand with ID ${data.brandId} not found`);
    }

    // Check if campaign with same name already exists
    const existingCampaign = await this.campaignRepository.findByName(data.name);
    if (existingCampaign) {
      throw new Error(`Campaign with name "${data.name}" already exists`);
    }

    // Ensure required fields have default values
    const brandId = data.brandId || "default-brand-id";
    const userId = data.userId || "system-user";

    // Create state metadata
    const stateMetadata = {
      updatedAt: new Date(),
      updatedBy: userId,
      comments: ""
    };

    // Create the campaign
    return await this.campaignRepository.create({
      brandId,
      name: data.name,
      description: data.description,
      objectives: data.objectives || [],
      startDate: data.startDate,
      endDate: data.endDate,
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
  async updateCampaign(
    id: string,
    updates: Partial<Omit<Campaign, "_id">>,
    userId: string
  ): Promise<Campaign | null> {
    // Get current campaign
    const campaign = await this.campaignRepository.findById(id);
    if (!campaign) return null;

    // Update state metadata
    const stateMetadata = {
      ...campaign.stateMetadata,
      updatedAt: new Date(),
      updatedBy: userId
    };

    // Apply updates
    return await this.campaignRepository.update(id, {
      ...updates,
      stateMetadata
    });
  }

  /**
   * Transition campaign status
   */
  async transitionCampaignStatus(
    id: string,
    targetStatus: CampaignStatus,
    metadata: StateTransitionMetadata
  ): Promise<Campaign | null> {
    // Get current campaign
    const campaign = await this.campaignRepository.findById(id);
    if (!campaign) return null;

    // Validate the transition
    this.validateStatusTransition(campaign.status, targetStatus);

    // Update state metadata
    const stateMetadata = {
      ...campaign.stateMetadata,
      updatedAt: new Date(),
      updatedBy: metadata.userId,
      comments: metadata.comments || campaign.stateMetadata?.comments
    };

    // Apply the status change
    return await this.campaignRepository.update(id, {
      status: targetStatus,
      stateMetadata
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
}
