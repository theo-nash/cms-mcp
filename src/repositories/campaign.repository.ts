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

    const document = {
      ...result,
      _id: this.fromObjectId(result._id)
    };

    return this.validate(document);
  }

  /**
   * Find campaigns by brand ID
   */
  async findByBrandId(brandId: string): Promise<Campaign[]> {
    return await this.find({ brandId })
  }

  /**
   * Find active campaigns for a brand
   */
  async findActiveCampaigns(brandId: string): Promise<Campaign[]> {
    return await this.find({
      brandId,
      status: CampaignStatus.Active
    })
  }

  /**
   * Find campaigns by date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Campaign[]> {
    return await this.find({
      startDate: { $gte: startDate },
      endDate: { $lte: endDate }
    });
  }

  async findByGoalType(goalType: string): Promise<Campaign[]> {
    return await this.find({
      "goals.type": goalType
    });
  }

  async findByAudienceSegment(segment: string): Promise<Campaign[]> {
    return await this.find({
      "audience.segment": segment
    });
  }

  async findByUpcomingMilestones(daysAhead: number = 7): Promise<Campaign[]> {
    const future = new Date();
    future.setDate(future.getDate() + daysAhead);

    return await this.find({
      "majorMilestones": {
        $elemMatch: {
          date: { $gte: new Date(), $lte: future },
          status: "pending"
        }
      }
    });
  }
}
