import { Campaign } from "../models/campaign.model.js";
import { CampaignRepository } from "../repositories/campaign.repository.js";

export class CampaignService {
  private campaignRepository: CampaignRepository;

  constructor() {
    this.campaignRepository = new CampaignRepository();
  }

  async createCampaign(
    data: Omit<Campaign, "_id" | "created_at" | "updated_at">
  ): Promise<Campaign> {
    return await this.campaignRepository.create(data);
  }

  async getCampaignById(id: string): Promise<Campaign | null> {
    return await this.campaignRepository.findById(id);
  }

  async getAllCampaigns(): Promise<Campaign[]> {
    return await this.campaignRepository.find({});
  }

  async updateCampaign(
    id: string,
    updates: Partial<Omit<Campaign, "_id">>
  ): Promise<Campaign | null> {
    return await this.campaignRepository.update(id, updates);
  }

  async deleteCampaign(id: string): Promise<boolean> {
    return await this.campaignRepository.delete(id);
  }
}
