import { BaseRepository } from "./base.repository.js";
import { Campaign, CampaignSchema, CampaignStatus } from "../models/campaign.model.js";

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

  /**
   * Find campaigns by brand ID
   */
  async findByBrandId(brandId: string): Promise<Campaign[]> {
    await this.initCollection();
    const results = await this.collection.find({ brandId }).toArray();
    return results.map(result => {
      const document = {
        ...result,
        _id: this.fromObjectId(result._id),
      };
      return this.validate(document);
    });
  }

  /**
   * Find active campaigns for a brand
   */
  async findActiveCampaigns(brandId: string): Promise<Campaign[]> {
    await this.initCollection();
    const results = await this.collection.find({
      brandId,
      status: CampaignStatus.Active
    }).toArray();
    return results.map(result => {
      const document = {
        ...result,
        _id: this.fromObjectId(result._id),
      };
      return this.validate(document);
    });
  }

  /**
   * Find campaigns by date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Campaign[]> {
    await this.initCollection();
    const results = await this.collection.find({
      startDate: { $gte: startDate },
      endDate: { $lte: endDate }
    }).toArray();
    return results.map(result => {
      const document = {
        ...result,
        _id: this.fromObjectId(result._id),
      };
      return this.validate(document);
    });
  }
}
