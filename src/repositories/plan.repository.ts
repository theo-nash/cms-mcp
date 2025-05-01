import { BaseRepository } from "./base.repository.js";
import { Plan, PlanSchema, PlanState, PlanType, MasterPlan, MicroPlan, MasterPlanSchema, MicroPlanSchema, MasterPlanUpdateSchema } from "../models/plan.model.js";
import { deepMerge, deepMergeArrays, toDate } from "../utils/merge.js";
import { create } from "domain";
import { stripNullValues } from "../utils/nulls.js";

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

      // Pass through validation to ensure all fields are properly formatted
      document = this.processDateFields(document);

      if ((document as any).type === PlanType.Master) {
        try {
          return MasterPlanSchema.parse(document) as MasterPlan;
        } catch (error) {
          // If validation fails, strip null values and try again
          const strippedData = stripNullValues(document);
          try {
            return MasterPlanSchema.parse(strippedData) as MasterPlan;
          } catch (secondError) {
            // If that also fails, provide defaults for missing fields
            const dataWithDefaults = this.provideDefaultsForMissingFields(strippedData);

            // Additional campaign-specific defaults
            const withCampaignDefaults = this.ensureCampaignDates(dataWithDefaults);
            return MasterPlanSchema.parse(withCampaignDefaults) as MasterPlan;
          }
        }
      } else if ((document as any).type === PlanType.Micro) {
        try {
          return MicroPlanSchema.parse(document) as MicroPlan;
        } catch (error) {
          // If validation fails, strip null values and try again
          const strippedData = stripNullValues(document);
          try {
            return MicroPlanSchema.parse(strippedData) as MicroPlan;
          } catch (secondError) {
            // If that also fails, provide defaults for missing fields
            const dataWithDefaults = this.provideDefaultsForMissingFields(strippedData);
            return MicroPlanSchema.parse(dataWithDefaults) as MicroPlan;
          }
        }
      } else {
        // Default case - try with the combined schema
        return this.validate(document);
      }
    });
  }

  async update(id: string, updates: Partial<Omit<Plan, "_id">>): Promise<Plan | null> {
    await this.initCollection();

    // Get existing plan
    const existingPlan = await this.findById(id);
    if (!existingPlan) return null;

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
      const masterUpdates = updates as Partial<Omit<MasterPlan, "_id">>;

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
      const microUpdates = updates as Partial<Omit<MicroPlan, "_id">>;
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

    console.log("processedUpdates", processedUpdates);

    // Strip null values from processed updates before merging
    const cleanedUpdates = stripNullValues(processedUpdates) || {};

    console.log("cleanedUpdates", cleanedUpdates);
    // Create merged plan
    const planToUpdate = deepMerge(
      existingPlan,
      {
        ...cleanedUpdates,
        updated_at: new Date()
      } as unknown as Partial<typeof existingPlan>
    );

    console.log("planToUpdate", planToUpdate);
    // Remove _id for update
    const { _id, ...updateData } = planToUpdate as any;

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
    const plans = await this.find({ type: PlanType.Master, campaignId });

    // Apply campaign date defaults to ensure all required fields are present
    return plans.map(plan => {
      // Handle edge case where the plan might still have missing required fields
      try {
        return plan as MasterPlan;
      } catch (error) {
        const withDefaults = this.ensureCampaignDates(plan);
        return withDefaults as MasterPlan;
      }
    });
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

    // Pass through validation to ensure all fields are properly formatted
    document = this.processDateFields(document);

    try {
      return MasterPlanSchema.parse(document) as MasterPlan;
    } catch (error) {
      // If validation fails, strip null values and try again
      const strippedData = stripNullValues(document);
      try {
        return MasterPlanSchema.parse(strippedData) as MasterPlan;
      } catch (secondError) {
        // If that also fails, provide defaults for missing fields
        const dataWithDefaults = this.provideDefaultsForMissingFields(strippedData);

        // Additional campaign-specific defaults
        const withCampaignDefaults = this.ensureCampaignDates(dataWithDefaults);
        return MasterPlanSchema.parse(withCampaignDefaults) as MasterPlan;
      }
    }
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

      // Pass through validation to ensure all fields are properly formatted
      document = this.processDateFields(document);

      try {
        return MicroPlanSchema.parse(document) as MicroPlan;
      } catch (error) {
        // If validation fails, strip null values and try again
        const strippedData = stripNullValues(document);
        try {
          return MicroPlanSchema.parse(strippedData) as MicroPlan;
        } catch (secondError) {
          // If that also fails, provide defaults for missing fields
          const dataWithDefaults = this.provideDefaultsForMissingFields(strippedData);
          return MicroPlanSchema.parse(dataWithDefaults) as MicroPlan;
        }
      }
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

    // Pass through validation to ensure all fields are properly formatted
    document = this.processDateFields(document);

    // Validate against the correct schema based on type
    if ((document as any).type === PlanType.Master) {
      try {
        return MasterPlanSchema.parse(document) as MasterPlan;
      } catch (error) {
        // If validation fails, strip null values and try again
        const strippedData = stripNullValues(document);
        try {
          return MasterPlanSchema.parse(strippedData) as MasterPlan;
        } catch (secondError) {
          // If that also fails, provide defaults for missing fields
          const dataWithDefaults = this.provideDefaultsForMissingFields(strippedData);

          // Additional campaign-specific defaults
          const withCampaignDefaults = this.ensureCampaignDates(dataWithDefaults);
          return MasterPlanSchema.parse(withCampaignDefaults) as MasterPlan;
        }
      }
    } else if ((document as any).type === PlanType.Micro) {
      try {
        return MicroPlanSchema.parse(document) as MicroPlan;
      } catch (error) {
        // If validation fails, strip null values and try again
        const strippedData = stripNullValues(document);
        try {
          return MicroPlanSchema.parse(strippedData) as MicroPlan;
        } catch (secondError) {
          // If that also fails, provide defaults for missing fields
          const dataWithDefaults = this.provideDefaultsForMissingFields(strippedData);
          return MicroPlanSchema.parse(dataWithDefaults) as MicroPlan;
        }
      }
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
      let document = {
        ...result,
        _id: this.fromObjectId(result._id),
      };

      // Pass through validation to ensure all fields are properly formatted
      document = this.processDateFields(document);

      try {
        return MasterPlanSchema.parse(document) as MasterPlan;
      } catch (error) {
        // If validation fails, strip null values and try again
        const strippedData = stripNullValues(document);
        try {
          return MasterPlanSchema.parse(strippedData) as MasterPlan;
        } catch (secondError) {
          // If that also fails, provide defaults for missing fields
          const dataWithDefaults = this.provideDefaultsForMissingFields(strippedData);

          // Additional campaign-specific defaults
          const withCampaignDefaults = this.ensureCampaignDates(dataWithDefaults);
          return MasterPlanSchema.parse(withCampaignDefaults) as MasterPlan;
        }
      }
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

      // Pass through validation to ensure all fields are properly formatted
      document = this.processDateFields(document);

      try {
        return MicroPlanSchema.parse(document) as MicroPlan;
      } catch (error) {
        // If validation fails, strip null values and try again
        const strippedData = stripNullValues(document);
        try {
          return MicroPlanSchema.parse(strippedData) as MicroPlan;
        } catch (secondError) {
          // If that also fails, provide defaults for missing fields
          const dataWithDefaults = this.provideDefaultsForMissingFields(strippedData);
          return MicroPlanSchema.parse(dataWithDefaults) as MicroPlan;
        }
      }
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
      };

      // Pass through validation to ensure all fields are properly formatted
      document = this.processDateFields(document);

      try {
        // Since these are Master plans
        return MasterPlanSchema.parse(document) as MasterPlan;
      } catch (error) {
        // If validation fails, strip null values and try again
        const strippedData = stripNullValues(document);
        try {
          return MasterPlanSchema.parse(strippedData) as MasterPlan;
        } catch (secondError) {
          // If that also fails, provide defaults for missing fields
          const dataWithDefaults = this.provideDefaultsForMissingFields(strippedData);

          // Additional campaign-specific defaults
          const withCampaignDefaults = this.ensureCampaignDates(dataWithDefaults);
          return MasterPlanSchema.parse(withCampaignDefaults) as MasterPlan;
        }
      }
    });
  }

  /**
   * Additional helper to ensure campaign-specific date fields have defaults
   */
  protected ensureCampaignDates(data: any): any {
    if (!data) return data;

    // Create a copy to avoid modifying the original
    const result = { ...data };

    // Handle campaign start and end dates
    if (result.startDate === undefined || result.startDate === null) {
      result.startDate = new Date(0);
    }

    if (result.endDate === undefined || result.endDate === null) {
      result.endDate = new Date(0);
    }

    // Handle milestone dates
    if (result.majorMilestones && Array.isArray(result.majorMilestones)) {
      result.majorMilestones = result.majorMilestones.map((milestone: any) => {
        if (!milestone) return { title: "Placeholder", date: new Date(0) };
        const updatedMilestone = { ...milestone };
        if (updatedMilestone.date === undefined || updatedMilestone.date === null) {
          updatedMilestone.date = new Date(0);
        }
        if (updatedMilestone.title === undefined || updatedMilestone.title === null) {
          updatedMilestone.title = "Placeholder";
        }
        return updatedMilestone;
      });
    }

    return result;
  }
}
