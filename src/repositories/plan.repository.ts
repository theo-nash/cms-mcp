import { BaseRepository } from "./base.repository.js";
import { Plan, PlanSchema, PlanState, PlanType, MasterPlan, MicroPlan, MasterPlanSchema, MicroPlanSchema, MasterPlanUpdateSchema, MicroPlanUpdateSchema } from "../models/plan.model.js";
import { deepMerge, deepMergeArrays, toDate } from "../utils/merge.js";
import { create } from "domain";
import { stripNullValues } from "../utils/nulls.js";
import { provideDefaultsForMissingFields } from "../utils/date.utils.js";

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
      let document = {
        ...result,
        _id: this.fromObjectId(result._id)
      };

      if ((document as any).type === PlanType.Master) {
        return this.validate(document, MasterPlanSchema) as MasterPlan;
      } else if ((document as any).type === PlanType.Micro) {
        return this.validate(document, MicroPlanSchema) as MicroPlan;
      } else {
        throw new Error(`Unknown plan type: ${(document as any).type}`);
      }
    });
  }

  async update(id: string, updates: Partial<Omit<Plan, "_id">>): Promise<Plan | null> {
    await this.initCollection();

    let updateSchema: any = null;
    let schema: any = null;

    // Get existing plan
    const existingPlan = await this.findById(id);
    if (!existingPlan) {
      throw new Error(`Cannot update non-existant plan. Plan with ID "${id}" not found.`);
    }

    switch (existingPlan.type) {
      case PlanType.Master:
        updateSchema = MasterPlanUpdateSchema;
        schema = MasterPlanSchema;
        break;
      case PlanType.Micro:
        updateSchema = MicroPlanUpdateSchema;
        schema = MicroPlanSchema;
        break;
      default:
        throw new Error(`Unsupported plan type`);
    }

    // Validate the updates against the schema
    updates = this.validate(updates, updateSchema) as Partial<Omit<Plan, "_id">>;

    // Process updates based on plan type
    const processedUpdates: Record<string, any> = { ...updates };

    // Handle stateMetadata properly
    if (updates.stateMetadata && existingPlan.stateMetadata) {
      processedUpdates.stateMetadata = deepMerge(
        existingPlan.stateMetadata,
        updates.stateMetadata
      );
    }

    // Handle type-specific fields
    if (existingPlan.type === PlanType.Master) {
      const masterPlan = existingPlan as MasterPlan;
      let masterUpdates = updates as Partial<Omit<MasterPlan, "_id">>;

      // Handle content strategy
      if (masterUpdates.contentStrategy && masterPlan.contentStrategy) {
        processedUpdates.contentStrategy = deepMerge(
          masterPlan.contentStrategy,
          masterUpdates.contentStrategy
        );
      }

      // Handle timeline - merge by date
      if (masterUpdates.timeline && masterPlan.timeline) {
        processedUpdates.timeline = deepMergeArrays(
          masterPlan.timeline,
          masterUpdates.timeline,
          'date'
        );
      }
    } else if (existingPlan.type === PlanType.Micro) {
      const microPlan = existingPlan as MicroPlan;
      let microUpdates = updates as Partial<Omit<MicroPlan, "_id">>;

      // Handle content series
      if (microUpdates.contentSeries && microPlan.contentSeries) {
        processedUpdates.contentSeries = deepMerge(
          microPlan.contentSeries,
          microUpdates.contentSeries
        );
      }

      // Handle performance metrics - merge by metricName
      if (microUpdates.performanceMetrics && microPlan.performanceMetrics) {
        processedUpdates.performanceMetrics = deepMergeArrays(
          microPlan.performanceMetrics,
          microUpdates.performanceMetrics,
          'metricName'
        );
      }
    }

    // Create merged plan
    const planToUpdate = deepMerge(
      existingPlan,
      {
        ...processedUpdates,
        updated_at: new Date()
      } as unknown as Partial<typeof existingPlan>
    );

    // Validate the merged plan against the schema
    const validatedPlan = this.validate(planToUpdate, schema) as Plan;

    // Remove _id for update
    const { _id, ...updateData } = validatedPlan as any;

    // Perform update
    await this.collection.updateOne(
      { _id: this.toObjectId(id) },
      { $set: updateData }
    );

    return this.findById(id);
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

    let document = {
      ...result,
      _id: this.fromObjectId(result._id),
    };

    // Pass through validation
    return this.validate(document, MasterPlanSchema) as MasterPlan;
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
      let document = {
        ...result,
        _id: this.fromObjectId(result._id),
      };

      return this.validate(document, MicroPlanSchema) as MicroPlan;
    });
  }

  /**
   * Find plan by name
   */
  async findPlanByName(name: string): Promise<Plan[] | null> {
    return await this.find({ title: name }) as Plan[];
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

    let document = {
      ...result,
      _id: this.fromObjectId(result._id),
    };

    // Get schema based on type
    let schema: any = null;

    switch (result.type) {
      case PlanType.Master:
        schema = MasterPlanSchema;
        break;
      case PlanType.Micro:
        schema = MicroPlanSchema;
        break;
      default:
        throw new Error(`Unknown plan type: ${result.type}`);
    }

    // Pass through validation to ensure all fields are properly formatted
    document = this.processDateFields(document);

    return this.validate(document, schema) as Plan;
  }

  async findMasterPlansByContentTheme(theme: string): Promise<MasterPlan[]> {
    await this.initCollection();
    const results = await this.collection.find({
      type: PlanType.Master,
      "contentStrategy.keyThemes": theme
    }).toArray();

    return results.map(result => {
      let document = {
        ...result,
        _id: this.fromObjectId(result._id),
      };

      return this.validate(document, MasterPlanSchema) as MasterPlan;
    });
  }

  async findMicroPlansByContentSeries(seriesName: string): Promise<MicroPlan[]> {
    await this.initCollection();
    const results = await this.collection.find({
      type: PlanType.Micro,
      "contentSeries.name": seriesName
    }).toArray();

    return results.map(result => {
      let document = {
        ...result,
        _id: this.fromObjectId(result._id),
      };

      return this.validate(document, MicroPlanSchema) as MicroPlan;
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
      let document = {
        ...result,
        _id: this.fromObjectId(result._id),
      } as Plan;

      switch (document.type) {
        case PlanType.Master:
          return this.validate(document, MasterPlanSchema) as MasterPlan;
        case PlanType.Micro:
          return this.validate(document, MicroPlanSchema) as MicroPlan;
        default:
          throw new Error(`Unknown plan type`);
      }
    });
  }

}
