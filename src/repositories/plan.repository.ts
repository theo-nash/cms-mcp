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

  async update(id: string, updates: Partial<Omit<Plan, "_id">>): Promise<Plan | null> {
    await this.initCollection();

    // First get the existing plan
    const existingPlan = await this.findById(id);
    if (!existingPlan) return null;

    // Create updated plan by merging
    const planToUpdate = {
      ...existingPlan,
      ...updates,
      updated_at: new Date()
    };

    // Remove _id for update operation
    const { _id, ...updateData } = planToUpdate as any;

    // Validate with the correct schema based on type
    let validatedData;

    if (planToUpdate.type === PlanType.Master) {
      validatedData = MasterPlanSchema.parse(planToUpdate);
    } else if (planToUpdate.type === PlanType.Micro) {
      validatedData = MicroPlanSchema.parse(planToUpdate);
    } else {
      validatedData = this.validate(planToUpdate);
    }

    // Perform the update
    await this.collection.updateOne(
      { _id: this.toObjectId(id) },
      { $set: updateData }
    );

    return validatedData;
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

  async findMasterPlansByContentTheme(theme: string): Promise<MasterPlan[]> {
    await this.initCollection();
    const results = await this.collection.find({
      type: PlanType.Master,
      "contentStrategy.keyThemes": theme
    }).toArray();

    return results.map(result => {
      const document = {
        ...result,
        _id: this.fromObjectId(result._id)
      };
      return MasterPlanSchema.parse(document) as MasterPlan;
    });
  }

  async findMicroPlansByContentSeries(seriesName: string): Promise<MicroPlan[]> {
    await this.initCollection();
    const results = await this.collection.find({
      type: PlanType.Micro,
      "contentSeries.name": seriesName
    }).toArray();

    return results.map(result => {
      const document = {
        ...result,
        _id: this.fromObjectId(result._id)
      };
      return MicroPlanSchema.parse(document) as MicroPlan;
    });
  }

  async findPlansWithUpcomingTimelineEvents(daysAhead: number = 7): Promise<Plan[]> {
    const future = new Date();
    future.setDate(future.getDate() + daysAhead);

    await this.initCollection();
    const results = await this.collection.find({
      type: PlanType.Master,
      "timeline": {
        $elemMatch: {
          date: { $gte: new Date(), $lte: future },
          status: { $ne: "completed" }
        }
      }
    }).toArray();

    return results.map(result => {
      const document = {
        ...result,
        _id: this.fromObjectId(result._id)
      };
      return this.validate(document);
    });
  }
}
