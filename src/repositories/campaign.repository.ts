import { BaseRepository } from "./base.repository.js";
import { Campaign, CampaignSchema } from "../models/campaign.model.js";

export class CampaignRepository extends BaseRepository<Campaign> {
  constructor() {
    super("campaigns", CampaignSchema);
  }

  async findByName(name: string): Promise<Campaign | null> {
    await this.initCollection();
    const result = await this.collection.findOne({ name });
    if (!result) return null;
    return this.validate({
      ...result,
      _id: this.fromObjectId(result._id),
    });
  }
}
