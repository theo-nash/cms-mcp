import { Campaign } from "../models/campaign.model.js";
import { Plan, PlanState, PlanType, MasterPlan, MicroPlan, MasterPlanCreationParams, MicroPlanCreationParams, MicroPlanUpdateParams, MasterPlanUpdateParams, MasterPlanCreationSchemaParser, MicroPlanCreationSchemaParser, MasterPlanUpdateSchemaParser, MicroPlanUpdateSchemaParser } from "../models/plan.model.js";
import { BrandRepository } from "../repositories/brand.repository.js";
import { CampaignRepository } from "../repositories/campaign.repository.js";
import { PlanRepository } from "../repositories/plan.repository.js";

export interface StateTransitionMetadata {
  userId: string;
  comments?: string;
}

export class PlanService {
  private planRepository: PlanRepository;
  private campaignRepository: CampaignRepository;
  private brandRepository: BrandRepository;
  constructor() {
    this.planRepository = new PlanRepository();
    this.campaignRepository = new CampaignRepository();
    this.brandRepository = new BrandRepository();
  }

  /**
   * Create a new master plan
   */
  async createMasterPlan(data: MasterPlanCreationParams): Promise<MasterPlan> {
    data = MasterPlanCreationSchemaParser.parse(data);

    // If campaign name is provided, get the campaign id
    let campaign: Campaign | null = null;

    if (data.campaignName) {
      campaign = await this.campaignRepository.findByName(data.campaignName);
      if (!campaign) {
        throw new Error(`Campaign with name ${data.campaignName} not found`);
      }
    } else if (data.campaignId) {
      campaign = await this.campaignRepository.findById(data.campaignId);
      if (!campaign) {
        throw new Error(`Campaign with id ${data.campaignId} not found`);
      }
    }

    if (!campaign) {
      throw new Error("Either campaignId or campaignName must be provided");
    }

    const masterPlanData: Omit<MasterPlan, "_id" | "updated_at"> = {
      ...data,
      type: PlanType.Master,
      campaignId: campaign._id!,
      state: PlanState.Draft,
      stateMetadata: {
        version: 1,
        updatedBy: "system-user",
        comments: ""
      },
      isActive: false,
      created_at: new Date()
    };

    return await this.planRepository.create(masterPlanData) as MasterPlan;
  }

  /**
   * Create a new micro plan
   */
  async createMicroPlan(data: MicroPlanCreationParams): Promise<MicroPlan> {
    data = MicroPlanCreationSchemaParser.parse(data);

    let masterPlan: MasterPlan | null = null;

    if (data.masterPlanId) {
      masterPlan = await this.planRepository.findById(data.masterPlanId) as MasterPlan;
    } else if (data.masterPlanName) {
      const plans = await this.planRepository.findPlanByName(data.masterPlanName);
      if (!plans || plans.length === 0) {
        throw new Error(`Master plan with name ${data.masterPlanName} not found`);
      }
      masterPlan = plans[0] as MasterPlan;
    }

    if (!masterPlan) {
      throw new Error("Either masterPlanId or masterPlanName must be provided");
    }

    const microPlanData: Omit<MicroPlan, "_id" | "updated_at"> = {
      ...data,
      type: PlanType.Micro,
      masterPlanId: masterPlan._id!,
      state: PlanState.Draft,
      stateMetadata: {
        version: 1,
        updatedBy: "system-user",
        comments: ""
      },
      isActive: false,
      created_at: new Date()
    };

    return await this.planRepository.create(microPlanData) as MicroPlan;
  }

  /**
   * Get master plans by campaign ID
   */
  async getMasterPlansByCampaignId(campaignId: string): Promise<MasterPlan[]> {
    return await this.planRepository.findMasterPlansByCampaignId(campaignId);
  }

  /**
   * Get master plan by name
   */
  async getMasterPlanByName(name: string): Promise<MasterPlan | null> {
    const plans = await this.planRepository.find({ title: name, type: PlanType.Master }) as MasterPlan[];
    // First, check if there is only one plan with the same name
    if (plans.length === 1) {
      return plans[0];
    }

    // If there are multiple, see if there is an active plan
    const activePlan = plans.find(plan => plan.isActive);
    if (activePlan) {
      return activePlan;
    }

    // If there are multiple plans with the same name, return the latest one
    return plans.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0] || null;
  }

  /**
   * Get master plan by ID
   */
  async getMasterPlanById(id: string): Promise<MasterPlan | null> {
    return await this.planRepository.findById(id) as MasterPlan;
  }

  /**
   * Get micro plans by master plan ID
   */
  async getMicroPlansByMasterId(masterPlanId: string): Promise<MicroPlan[]> {
    return await this.planRepository.findMicroPlansByMasterId(masterPlanId);
  }

  /**
   * Get micro plan by name
   */
  async getMicroPlanByName(name: string): Promise<MicroPlan | null> {
    const plans = await this.planRepository.find({ title: name, type: PlanType.Micro }) as MicroPlan[];
    // First, check if there is only one plan with the same name
    if (plans.length === 1) {
      return plans[0];
    }

    // If there are multiple, see if there is an active plan
    const activePlan = plans.find(plan => plan.isActive);
    if (activePlan) {
      return activePlan;
    }

    // If there are multiple plans with the same name, return the latest one
    return plans.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0] || null;
  }

  /**
   * Get active master plan for a campaign
   */
  async getActiveMasterPlan(campaignId: string): Promise<MasterPlan | null> {
    return await this.planRepository.findActiveMasterPlan(campaignId);
  }

  /**
   * Get active micro plans for a master plan
   */
  async getActiveMicroPlans(masterPlanId: string): Promise<MicroPlan[]> {
    return await this.planRepository.findActiveMicroPlans(masterPlanId);
  }

  /**
   * Get all master plans for a campaign
   */
  async getAllMasterPlansByCampaignId(campaignId: string): Promise<MasterPlan[]> {
    return await this.planRepository.findMasterPlansByCampaignId(campaignId);
  }

  /**
   * Get all micro plans for a master plan
   */
  async getAllMicroPlansByMasterId(masterPlanId: string): Promise<MicroPlan[]> {
    return await this.planRepository.findMicroPlansByMasterId(masterPlanId);
  }

  /**
   * Get all plans (both master and micro) for a campaign
   */
  async getAllPlansByCampaignId(campaignId: string): Promise<Plan[]> {
    // Get all master plans
    const masterPlans = await this.planRepository.findMasterPlansByCampaignId(campaignId);

    // Get all micro plans for each master plan
    const microPlansPromises = masterPlans.map(masterPlan =>
      this.planRepository.findMicroPlansByMasterId(masterPlan._id!)
    );

    const microPlansArrays = await Promise.all(microPlansPromises);
    const microPlans = microPlansArrays.flat();

    return [...masterPlans, ...microPlans];
  }

  /**
   * Get all plans
   */
  async getAllPlans(): Promise<Plan[]> {
    // Retrieve master plans and micro plans separately and then combine them
    const masterPlans = await this.planRepository.find({ type: PlanType.Master });
    const microPlans = await this.planRepository.find({ type: PlanType.Micro });

    return [...masterPlans, ...microPlans];
  }

  /**
   * Update plan
   */
  async updatePlan(
    updates: MasterPlanUpdateParams | MicroPlanUpdateParams,
  ): Promise<Plan | null> {

    if (!updates.plan_id && !updates.plan_name) {
      throw new Error("Either plan_id or plan_name must be provided");
    }

    let plan: Plan | null = null;

    if (updates.plan_id) {
      plan = await this.planRepository.findById(updates.plan_id);
    } else if (updates.plan_name) {
      const plans = await this.planRepository.findPlanByName(updates.plan_name);
      if (!plans || plans.length === 0) {
        throw new Error(`Plan with name ${updates.plan_name} not found`);
      }
      plan = plans[0];
    }

    if (!plan) {
      throw new Error("Plan not found");
    }

    // Update state metadata
    const stateMetadata = {
      ...plan.stateMetadata,
      updatedBy: "system-user"
    };

    // Apply updates
    return await this.planRepository.update(plan._id!, {
      ...updates,
      stateMetadata
    });
  }

  /**
   * Transition plan state
   */
  async transitionPlanState(
    id: string,
    targetState: PlanState,
    metadata: StateTransitionMetadata
  ): Promise<Plan | null> {
    // Get current plan
    const plan = await this.planRepository.findById(id);
    if (!plan) return null;

    // Validate the transition
    this.validateStateTransition(plan.state, targetState);

    // Update state metadata
    const stateMetadata = {
      ...plan.stateMetadata,
      updatedAt: new Date(),
      updatedBy: metadata.userId,
      comments: metadata.comments || plan.stateMetadata.comments
    };

    // Apply the state change
    return await this.planRepository.update(id, {
      state: targetState,
      stateMetadata,
      isActive: targetState === PlanState.Active ? true : plan.isActive
    });
  }

  /**
   * Activate a plan
   */
  async activatePlan(id: string, userId: string): Promise<Plan | null> {
    // Get current plan
    const plan = await this.planRepository.findById(id);
    if (!plan) return null;

    // Deactivate other plans of the same type
    if (plan.type === PlanType.Master) {
      await this.planRepository.deactivateAllMasterPlans(plan.campaignId);
    } else {
      await this.planRepository.deactivateAllMicroPlans(plan.masterPlanId);
    }

    // Update state metadata
    const stateMetadata = {
      ...plan.stateMetadata,
      updatedAt: new Date(),
      updatedBy: userId
    };

    // Activate the plan
    return await this.planRepository.update(id, {
      isActive: true,
      stateMetadata
    });
  }

  /**
   * Validate state transition
   */
  private validateStateTransition(currentState: PlanState, targetState: PlanState): void {
    // Define valid transitions
    const validTransitions: Record<PlanState, PlanState[]> = {
      [PlanState.Draft]: [PlanState.Review, PlanState.Approved],
      [PlanState.Review]: [PlanState.Draft, PlanState.Approved],
      [PlanState.Approved]: [PlanState.Active, PlanState.Draft],
      [PlanState.Active]: [PlanState.Draft]
    };

    // Check if transition is valid
    if (!validTransitions[currentState].includes(targetState)) {
      throw new Error(`Invalid state transition from ${currentState} to ${targetState}.  Valid transitions are: ${validTransitions[currentState].join(", ")}`);
    }
  }

  /**
   * Get a plan by ID
   */
  async getPlan(id: string): Promise<Plan | null> {
    return await this.planRepository.findById(id);
  }

  /**
   * Get plans by brand ID
   */
  async getPlansByBrandId(brandId: string): Promise<Plan[]> {
    // Get all campaigns for the brand
    const campaigns = await this.campaignRepository.findByBrandId(brandId);

    // Get all master plans for each campaign
    const masterPlansPromises = campaigns.map(campaign =>
      this.planRepository.findMasterPlansByCampaignId(campaign._id!)
    );

    const masterPlansArrays = await Promise.all(masterPlansPromises);
    const masterPlans = masterPlansArrays.flat();

    // Then get all micro plans for these master plans
    const microPlansPromises = masterPlans.map(masterPlan =>
      this.planRepository.findMicroPlansByMasterId(masterPlan._id!)
    );

    const microPlansArrays = await Promise.all(microPlansPromises);
    const microPlans = microPlansArrays.flat();

    return [...masterPlans, ...microPlans];
  }

  /**
   * Get plans by brand name
   */
  async getPlansByBrandName(brandName: string): Promise<Plan[]> {
    // Get brand id from brand name 
    const brand = await this.brandRepository.findByName(brandName);
    if (!brand) return [];

    return await this.getPlansByBrandId(brand._id!);
  }

  async updateTimelineEventStatus(
    planId: string,
    eventIndex: number,
    status: 'pending' | 'in-progress' | 'completed',
    userId: string
  ): Promise<MasterPlan | null> {
    const plan = await this.getPlan(planId) as MasterPlan;
    if (!plan || plan.type !== PlanType.Master || !plan.timeline || !plan.timeline[eventIndex]) {
      return null;
    }

    // Clone the timeline array to avoid direct mutation
    const timeline = [...plan.timeline];
    timeline[eventIndex] = {
      ...timeline[eventIndex],
      status
    };

    // Update the plan - explicitly type as a master plan with timeline field
    const updates: Partial<Omit<MasterPlan, "_id">> = {
      timeline
    };

    return await this.planRepository.update(
      planId,
      updates
    ) as MasterPlan;
  }

  async updateContentSeries(
    planId: string,
    contentSeries: {
      name?: string;
      description?: string;
      expectedPieces?: number;
      theme?: string;
    },
    userId: string
  ): Promise<MicroPlan | null> {
    const plan = await this.getPlan(planId) as MicroPlan;
    if (!plan || plan.type !== PlanType.Micro) {
      return null;
    }

    // Update the plan - explicitly type as a micro plan with contentSeries field
    const updates: Partial<Omit<MicroPlan, "_id">> = {
      contentSeries
    };

    return await this.planRepository.update(
      planId,
      updates
    ) as MicroPlan;
  }

  async deletePlan(id: string): Promise<Boolean | null> {
    return await this.planRepository.delete(id);
  }
}
