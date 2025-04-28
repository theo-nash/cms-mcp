import { BaseRepository } from "./base.repository.js";
import { Plan, PlanSchema, PlanState, PlanType, MasterPlan, MicroPlan, MasterPlanSchema, MicroPlanSchema } from "../models/plan.model.js";

export class PlanRepository extends BaseRepository<Plan> {
  constructor() {
    super("plans", PlanSchema);
  }

  /**
   * Override find to handle different plan types correctly
   */
  async find(query: any = {}): Promise<Plan[]> {
    await this.initCollection();
    const results = await this.collection.find(query).toArray();

    return results.map(result => {
      const document = {
        ...result,
        _id: this.fromObjectId(result._id)
      };

      // Validate against the correct schema based on type
      if ((document as any).type === PlanType.Master) {
        return MasterPlanSchema.parse(document) as MasterPlan;
      } else if ((document as any).type === PlanType.Micro) {
        return MicroPlanSchema.parse(document) as MicroPlan;
      } else {
        // Default case - try with the combined schema
        return this.validate(document);
      }
    });
  }

  /**
   * Find all micro plans for a master plan
   */
  async findMicroPlansByMasterId(masterPlanId: string): Promise<MicroPlan[]> {
    return await this.find({ type: PlanType.Micro, masterPlanId }) as MicroPlan[];
  }

  /**
   * Find all master plans for a campaign
   */
  async findMasterPlansByCampaignId(campaignId: string): Promise<MasterPlan[]> {
    return await this.find({ type: PlanType.Master, campaignId }) as MasterPlan[];
  }

  /**
   * Find active master plan for a campaign
   */
  async findActiveMasterPlan(campaignId: string): Promise<MasterPlan | null> {
    await this.initCollection();
    const result = await this.collection.findOne({
      type: PlanType.Master,
      campaignId,
      state: PlanState.Active,
      isActive: true,
    });

    if (!result) return null;

    const document = {
      ...result,
      _id: this.fromObjectId(result._id),
    };
    return MasterPlanSchema.parse(document) as MasterPlan;
  }

  /**
   * Find active micro plans for a master plan
   */
  async findActiveMicroPlans(masterPlanId: string): Promise<MicroPlan[]> {
    await this.initCollection();
    const results = await this.collection.find({
      type: PlanType.Micro,
      masterPlanId,
      state: PlanState.Active,
      isActive: true,
    }).toArray();

    return results.map(result => {
      const document = {
        ...result,
        _id: this.fromObjectId(result._id),
      };
      return MicroPlanSchema.parse(document) as MicroPlan;
    });
  }

  /**
   * Deactivate all plans of a specific type for a campaign
   */
  async deactivateAllMasterPlans(campaignId: string): Promise<void> {
    await this.initCollection();
    await this.collection.updateMany(
      { type: PlanType.Master, campaignId, isActive: true },
      { $set: { isActive: false } }
    );
  }

  /**
   * Deactivate all micro plans for a master plan
   */
  async deactivateAllMicroPlans(masterPlanId: string): Promise<void> {
    await this.initCollection();
    await this.collection.updateMany(
      { type: PlanType.Micro, masterPlanId, isActive: true },
      { $set: { isActive: false } }
    );
  }

  async findByCampaignId(campaignId: string): Promise<Plan[]> {
    return await this.find({ campaignId });
  }

  /**
   * Override findById to handle different plan types
   */
  async findById(id: string): Promise<Plan | null> {
    await this.initCollection();
    const result = await this.collection.findOne({ _id: this.toObjectId(id) });

    if (!result) return null;

    const document = {
      ...result,
      _id: this.fromObjectId(result._id)
    };

    // Validate against the correct schema based on type
    if ((document as any).type === PlanType.Master) {
      return MasterPlanSchema.parse(document) as MasterPlan;
    } else if ((document as any).type === PlanType.Micro) {
      return MicroPlanSchema.parse(document) as MicroPlan;
    } else {
      // Default case - try with the combined schema
      return this.validate(document);
    }
  }
}
