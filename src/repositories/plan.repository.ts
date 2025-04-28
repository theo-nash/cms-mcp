import { BaseRepository } from "./base.repository.js";
import { Plan, PlanSchema, PlanState, PlanType } from "../models/plan.model.js";

export class PlanRepository extends BaseRepository<Plan> {
  constructor() {
    super("plans", PlanSchema);
  }

  /**
   * Find plans by brand ID
   */
  async findByBrandId(brandId: string): Promise<Plan[]> {
    await this.initCollection();
    const results = await this.collection.find({ brandId }).toArray();

    return results.map((result) => {
      // Convert _id to string
      const document = {
        ...result,
        _id: this.fromObjectId(result._id),
      };

      return this.validate(document);
    });
  }

  /**
   * Find micro plans by parent plan ID
   */
  async findMicroPlansByParentId(parentPlanId: string): Promise<Plan[]> {
    await this.initCollection();
    const results = await this.collection
      .find({
        parentPlanId,
        type: PlanType.Micro,
      })
      .toArray();

    return results.map((result) => {
      // Convert _id to string
      const document = {
        ...result,
        _id: this.fromObjectId(result._id),
      };

      return this.validate(document);
    });
  }

  /**
   * Find active plan for a brand
   */
  async findActivePlan(brandId: string, type: PlanType): Promise<Plan | null> {
    await this.initCollection();
    const result = await this.collection.findOne({
      brandId,
      type,
      state: PlanState.Active,
      isActive: true,
    });

    if (!result) return null;

    // Convert _id to string
    const document = {
      ...result,
      _id: this.fromObjectId(result._id),
    };

    return this.validate(document);
  }

  /**
   * Deactivate all plans of a specific type for a brand
   */
  async deactivateAllPlans(brandId: string, type: PlanType): Promise<void> {
    await this.initCollection();
    await this.collection.updateMany(
      { brandId, type, isActive: true },
      { $set: { isActive: false } }
    );
  }

  async findByCampaignId(campaignId: string): Promise<Plan[]> {
    await this.initCollection();
    const results = await this.collection.find({ campaignId }).toArray();
    return results.map((result) => {
      const document = {
        ...result,
        _id: this.fromObjectId(result._id),
      };
      return this.validate(document);
    });
  }
}
