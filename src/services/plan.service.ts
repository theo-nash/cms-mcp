import { Plan, PlanState, PlanType } from "../models/plan.model.js";
import { PlanRepository } from "../repositories/plan.repository.js";

export interface PlanCreationData {
  brandId: string;
  title: string;
  type: PlanType;
  parentPlanId?: string;
  campaignId?: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  goals: string[];
  targetAudience: string;
  channels: string[];
  userId: string;
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
   * Create a new plan
   */
  async createPlan(data: PlanCreationData): Promise<Plan> {
    // If this is a micro plan, validate parent plan exists and no campaignId is set
    if (data.type === PlanType.Micro) {
      if (!data.parentPlanId) {
        throw new Error("Micro plans must have a parent master plan");
      }
      if (data.campaignId) {
        throw new Error("Micro plans cannot be directly linked to a campaign");
      }
      const parentPlan = await this.planRepository.findById(data.parentPlanId);
      if (!parentPlan) {
        throw new Error(`Parent plan with ID ${data.parentPlanId} not found`);
      }
      if (parentPlan.type !== PlanType.Master) {
        throw new Error("Parent plan must be a master plan");
      }
      if (parentPlan.brandId !== data.brandId) {
        throw new Error("Parent plan must belong to the same brand");
      }
    }

    // Create state metadata
    const stateMetadata = {
      version: 1,
      updatedAt: new Date(),
      updatedBy: data.userId,
      comments: "",
    };

    // Create the plan
    return await this.planRepository.create({
      brandId: data.brandId,
      title: data.title,
      type: data.type,
      parentPlanId: data.parentPlanId,
      campaignId: data.campaignId,
      dateRange: data.dateRange,
      goals: data.goals,
      targetAudience: data.targetAudience,
      channels: data.channels,
      state: PlanState.Draft,
      stateMetadata,
      isActive: false,
    });
  }

  /**
   * Get plan by ID
   */
  async getPlan(planId: string): Promise<Plan | null> {
    return await this.planRepository.findById(planId);
  }

  /**
   * Get plans by brand ID
   */
  async getPlansByBrandId(brandId: string): Promise<Plan[]> {
    return await this.planRepository.findByBrandId(brandId);
  }

  /**
   * Get micro plans by parent ID
   */
  async getMicroPlansByParentId(parentPlanId: string): Promise<Plan[]> {
    return await this.planRepository.findMicroPlansByParentId(parentPlanId);
  }

  /**
   * Update plan
   */
  async updatePlan(
    planId: string,
    updates: Partial<PlanCreationData>,
    userId: string
  ): Promise<Plan | null> {
    // Get current plan
    const plan = await this.planRepository.findById(planId);
    if (!plan) return null;

    // Only allow updates if plan is in Draft state
    if (plan.state !== PlanState.Draft) {
      throw new Error("Can only update plans in Draft state");
    }

    // Update state metadata
    const stateMetadata = {
      ...plan.stateMetadata,
      updatedAt: new Date(),
      updatedBy: userId,
    };

    // Apply updates
    return await this.planRepository.update(planId, {
      ...updates,
      stateMetadata,
    });
  }

  /**
   * Transition plan state
   */
  async transitionPlanState(
    planId: string,
    targetState: PlanState,
    metadata: StateTransitionMetadata
  ): Promise<Plan | null> {
    // Get current plan
    const plan = await this.planRepository.findById(planId);
    if (!plan) return null;

    // Validate the transition
    this.validateStateTransition(plan.state, targetState);

    // Update state metadata
    const stateMetadata = {
      ...plan.stateMetadata,
      updatedAt: new Date(),
      updatedBy: metadata.userId,
      comments: metadata.comments || plan.stateMetadata.comments,
    };

    // If transitioning to Active, increment version
    if (targetState === PlanState.Active) {
      stateMetadata.version = plan.stateMetadata.version + 1;

      // Deactivate other active plans of the same type
      await this.planRepository.deactivateAllPlans(plan.brandId, plan.type);
    }

    // Apply the state change
    return await this.planRepository.update(planId, {
      state: targetState,
      isActive: targetState === PlanState.Active,
      stateMetadata,
    });
  }

  /**
   * Validate state transition
   */
  private validateStateTransition(
    currentState: PlanState,
    targetState: PlanState
  ): void {
    // Define valid transitions
    const validTransitions: Record<PlanState, PlanState[]> = {
      [PlanState.Draft]: [PlanState.Review],
      [PlanState.Review]: [PlanState.Draft, PlanState.Approved],
      [PlanState.Approved]: [PlanState.Active, PlanState.Draft],
      [PlanState.Active]: [PlanState.Draft],
    };

    // Check if transition is valid
    if (!validTransitions[currentState].includes(targetState)) {
      throw new Error(
        `Invalid state transition from ${currentState} to ${targetState}`
      );
    }
  }

  /**
   * Get all plans
   */
  async getAllPlans(): Promise<Plan[]> {
    return await this.planRepository.find({});
  }
}
