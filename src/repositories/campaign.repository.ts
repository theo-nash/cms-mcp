import { Collection, ObjectId } from "mongodb";
import { BaseRepository } from "./base.repository.js";
import { Campaign, CampaignSchema, CampaignStatus } from "../models/campaign.model.js";

export class CampaignRepository extends BaseRepository<Campaign> {
  constructor() {
    super("campaigns", CampaignSchema);
  }

  /**
   * Find campaign by name
   */
  async findByName(name: string): Promise<Campaign | null> {
    const campaigns = await this.find({ name, isActive: true });
    return campaigns.length > 0 ? campaigns[0] : null;
  }

  /**
   * Find campaigns by brand ID
   */
  async findByBrandId(brandId: string): Promise<Campaign[]> {
    return this.find({ brandId, isActive: true });
  }

  /**
   * Find active campaigns for a brand
   */
  async findActiveCampaigns(brandId: string): Promise<Campaign[]> {
    return this.find({
      brandId,
      status: CampaignStatus.Active,
      isActive: true
    });
  }

  /**
   * Find campaigns by date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Campaign[]> {
    return this.find({
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } },
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } }
      ],
      isActive: true
    });
  }

  /**
   * Find campaigns by goal type
   */
  async findByGoalType(goalType: string): Promise<Campaign[]> {
    return this.find({
      "goals.type": goalType,
      isActive: true
    });
  }

  /**
   * Find campaigns by audience segment
   */
  async findByAudienceSegment(segment: string): Promise<Campaign[]> {
    return this.find({
      "audience.segment": segment,
      isActive: true
    });
  }

  /**
   * Find campaigns with upcoming milestones
   */
  async findByUpcomingMilestones(daysAhead: number = 7): Promise<Campaign[]> {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + daysAhead);

    return this.find({
      "majorMilestones.date": { $gte: now, $lte: future },
      "majorMilestones.status": "pending",
      isActive: true
    });
  }

  /**
   * Find active version by root campaign ID
   */
  async findActiveVersionByRoot(rootId: string): Promise<Campaign | null> {
    const results = await this.find({
      $or: [
        { _id: rootId, isActive: true },
        { rootCampaignId: rootId, isActive: true }
      ]
    });

    return results.length > 0 ? results[0] : null;
  }

  /**
   * Find all versions of campaign by root ID
   */
  async findAllVersionsByRoot(rootId: string): Promise<Campaign[]> {
    return this.find({
      $or: [
        { _id: rootId },
        { rootCampaignId: rootId }
      ]
    }, false); // Pass false to get all versions including inactive ones
  }

  /**
   * Find specific version of campaign by root ID and version number
   */
  async findVersionByRoot(rootId: string, version: number): Promise<Campaign | null> {
    const results = await this.find({
      $or: [
        { _id: rootId, version },
        { rootCampaignId: rootId, version }
      ]
    }, false); // Pass false to get the specific version even if inactive

    return results.length > 0 ? results[0] : null;
  }

  /**
   * Deactivate all versions of campaign with the same root
   */
  async deactivateAllVersionsByRoot(rootId: string): Promise<void> {
    await this.initCollection();

    await this.collection.updateMany(
      {
        $or: [
          { _id: this.toObjectId(rootId) },
          { rootCampaignId: rootId }
        ]
      },
      { $set: { isActive: false } }
    );
  }

  /**
   * Override find method to only return active versions by default
   */
  async find(query: any = {}, activeOnly: boolean = true): Promise<Campaign[]> {
    // If query doesn't specify isActive and activeOnly is true, only return active versions
    if (query.isActive === undefined && activeOnly) {
      query.isActive = true;
    }

    return super.find(query);
  }
}
