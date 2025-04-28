import { z } from "zod";

// Plan types
export enum PlanType {
  Master = "master",
  Micro = "micro",
}

// Plan states
export enum PlanState {
  Draft = "draft",
  Review = "review",
  Approved = "approved",
  Active = "active",
}

// Base plan schema with common fields
const BasePlanSchema = z.object({
  _id: z.string().optional(),
  title: z.string(),
  type: z.nativeEnum(PlanType),
  dateRange: z.object({
    start: z.union([z.string(), z.date()]).transform((val) => new Date(val)),
    end: z.union([z.string(), z.date()]).transform((val) => new Date(val)),
  }),
  goals: z.array(z.string()),
  targetAudience: z.string(),
  channels: z.array(z.string()),
  state: z.nativeEnum(PlanState).default(PlanState.Draft),
  stateMetadata: z.object({
    version: z.number().default(1),
    updatedAt: z.date().default(() => new Date()),
    updatedBy: z.string(),
    comments: z.string().optional(),
  }),
  isActive: z.boolean().default(false),
  created_at: z.date().default(() => new Date()),
  updated_at: z.date().default(() => new Date()),
});

// Master plan schema
export const MasterPlanSchema = BasePlanSchema.extend({
  type: z.literal(PlanType.Master),
  campaignId: z.string(), // Required reference to parent campaign

  // More detailed goals specific to this plan
  planGoals: z.array(z.object({
    campaignGoalId: z.string(), // Reference to campaign goal
    description: z.string(),
    metrics: z.array(z.object({
      name: z.string(),
      target: z.number()
    }))
  })).optional(),

  // Content strategy
  contentStrategy: z.object({
    approach: z.string(),
    keyThemes: z.array(z.string()),
    distribution: z.record(z.string(), z.number()) // Channel: percentage
  }).optional(),

  // Detailed timeline
  timeline: z.array(z.object({
    date: z.union([z.string(), z.date()]).transform((val) => new Date(val)),
    description: z.string(),
    type: z.string(), // e.g., "Content Release", "Campaign Phase"
    status: z.enum(['pending', 'in-progress', 'completed']).default('pending')
  })).optional()
});

// Micro plan schema
export const MicroPlanSchema = BasePlanSchema.extend({
  type: z.literal(PlanType.Micro),
  masterPlanId: z.string(), // Required reference to parent master plan

  // Content series information
  contentSeries: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    expectedPieces: z.number().optional(),
    theme: z.string().optional()
  }).optional(),

  // Content performance tracking
  performanceMetrics: z.array(z.object({
    metricName: z.string(),
    target: z.number(),
    actual: z.number().optional()
  })).optional()
});

// Combined plan schema for database operations
export const PlanSchema = z.discriminatedUnion("type", [
  MasterPlanSchema,
  MicroPlanSchema
]);

// Export types
export type Plan = z.infer<typeof PlanSchema>;
export type MasterPlan = z.infer<typeof MasterPlanSchema>;
export type MicroPlan = z.infer<typeof MicroPlanSchema>;
