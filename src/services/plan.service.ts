import { Plan, PlanState, PlanType, MasterPlan, MicroPlan } from "../models/plan.model.js";
import { PlanRepository } from "../repositories/plan.repository.js";

export interface MasterPlanCreationData {
  campaignId: string;
  title: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  goals: string[];
  targetAudience: string;
  channels: string[];
  userId: string;
  planGoals?: Array<{
    campaignGoalId: string;
    description: string;
    metrics: Array<{
      name: string;
      target: number;
    }>;
  }>;
  contentStrategy?: {
    approach: string;
    keyThemes: string[];
    distribution: Record<string, number>;
  };
  timeline?: Array<{
    date: Date;
    description: string;
    type: string;
    status?: 'pending' | 'in-progress' | 'completed';
  }>;
}

export interface MicroPlanCreationData {
  masterPlanId: string;
  title: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  goals: string[];
  targetAudience: string;
  channels: string[];
  userId: string;
  contentSeries?: {
    name?: string;
    description?: string;
    expectedPieces?: number;
    theme?: string;
  };
  performanceMetrics?: Array<{
    metricName: string;
    target: number;
    actual?: number;
  }>;
}

export interface StateTransitionMetadata {
  userId: string;
  comments?: string;
}

export class PlanService {
  private planRepository: PlanRepository;

  constructor() {
    this.planRepository = new PlanRepository();
  }

  /**
   * Create a new master plan
   */
  async createMasterPlan(data: MasterPlanCreationData): Promise<MasterPlan> {
    const masterPlanData: Omit<MasterPlan, "_id" | "updated_at"> = {
      type: PlanType.Master,
      campaignId: data.campaignId,
      title: data.title,
      dateRange: data.dateRange,
      goals: data.goals,
      targetAudience: data.targetAudience,
      channels: data.channels,
      state: PlanState.Draft,
      stateMetadata: {
        version: 1,
        updatedAt: new Date(),
        updatedBy: data.userId,
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
  async createMicroPlan(data: MicroPlanCreationData): Promise<MicroPlan> {
    const microPlanData: Omit<MicroPlan, "_id" | "updated_at"> = {
      type: PlanType.Micro,
      masterPlanId: data.masterPlanId,
      title: data.title,
      dateRange: data.dateRange,
      goals: data.goals,
      targetAudience: data.targetAudience,
      channels: data.channels,
      state: PlanState.Draft,
      stateMetadata: {
        version: 1,
        updatedAt: new Date(),
        updatedBy: data.userId,
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
   * Get micro plans by master plan ID
   */
  async getMicroPlansByMasterId(masterPlanId: string): Promise<MicroPlan[]> {
    return await this.planRepository.findMicroPlansByMasterId(masterPlanId);
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
    id: string,
    updates: Partial<Omit<Plan, "_id">>,
    userId: string
  ): Promise<Plan | null> {
    // Get current plan
    const plan = await this.planRepository.findById(id);
    if (!plan) return null;

    // Update state metadata
    const stateMetadata = {
      ...plan.stateMetadata,
      updatedAt: new Date(),
      updatedBy: userId
    };

    // Apply updates
    return await this.planRepository.update(id, {
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
      stateMetadata
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
      [PlanState.Draft]: [PlanState.Review],
      [PlanState.Review]: [PlanState.Draft, PlanState.Approved],
      [PlanState.Approved]: [PlanState.Active, PlanState.Draft],
      [PlanState.Active]: [PlanState.Draft]
    };

    // Check if transition is valid
    if (!validTransitions[currentState].includes(targetState)) {
      throw new Error(`Invalid state transition from ${currentState} to ${targetState}`);
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
    // First get all master plans
    const plans = await this.planRepository.find({ type: PlanType.Master });
    const masterPlans = plans as MasterPlan[];

    // Then get all micro plans for these master plans
    const microPlansPromises = masterPlans.map(masterPlan =>
      this.planRepository.findMicroPlansByMasterId(masterPlan._id!)
    );

    const microPlansArrays = await Promise.all(microPlansPromises);
    const microPlans = microPlansArrays.flat();

    return [...masterPlans, ...microPlans];
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

}
