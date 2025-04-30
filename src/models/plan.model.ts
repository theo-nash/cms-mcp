import { z } from "zod";
import { dateSchema, optionalDateSchema } from "../utils/date.utils.js";

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

// Base schema with common fields for all plans
export const BasePlanSchema = z.object({
  title: z.string().min(1).describe("Title of the plan - should be clear and descriptive"),
  dateRange: z.object({
    start: dateSchema.describe("When the plan begins"),
    end: dateSchema.describe("When the plan ends")
  }).describe("Date range for the plan's execution"),
  goals: z.array(z.string()).describe("Key goals this plan aims to achieve"),
  targetAudience: z.string().describe("Description of the target audience for this plan"),
  channels: z.array(z.string()).describe("Distribution channels for content (e.g., Twitter, LinkedIn)"),
  state: z.nativeEnum(PlanState).default(PlanState.Draft)
    .describe("Current state of the plan: draft, review, approved, or active"),
  stateMetadata: z.object({
    version: z.number().int().min(1).default(1).describe("Version number of the plan"),
    updatedAt: dateSchema.default(() => new Date()).describe("When the plan was last updated"),
    updatedBy: z.string().describe("User ID of who last updated the plan"),
    comments: z.string().optional().describe("Additional notes about the most recent update")
  }).describe("Metadata about plan state changes"),
  isActive: z.boolean().default(false).describe("Whether this plan is currently active"),
  created_at: dateSchema.default(() => new Date()).describe("When the plan was created"),
  updated_at: dateSchema.default(() => new Date()).describe("When the plan was last modified")
});

// Master Plan schema
export const MasterPlanSchema = BasePlanSchema.extend({
  _id: z.string().optional().describe("Unique identifier for the plan in the database"),
  type: z.literal(PlanType.Master).default(PlanType.Master).describe("Type of plan (master)"),
  campaignId: z.string().describe("ID of the campaign this master plan belongs to"),
  planGoals: z.array(z.object({
    campaignGoalId: z.string().describe("ID of the campaign goal this plan goal is linked to"),
    description: z.string().describe("Description of this specific plan goal"),
    metrics: z.array(z.object({
      name: z.string().describe("Name of the metric"),
      target: z.number().describe("Target value for this metric")
    })).describe("Metrics for measuring this plan goal")
  })).optional().describe("Detailed goals linked to campaign goals"),
  contentStrategy: z.object({
    approach: z.string().describe("High-level approach for content creation"),
    keyThemes: z.array(z.string()).describe("Key themes to be covered in content"),
    distribution: z.record(z.string(), z.number()).describe("Distribution percentages across channels")
  }).optional().describe("Content strategy details"),
  timeline: z.array(z.object({
    date: dateSchema.describe("Date for this timeline event"),
    description: z.string().describe("Description of the timeline event"),
    type: z.string().describe("Type of event (e.g., launch, release, review)"),
    status: z.enum(["pending", "in-progress", "completed"]).default("pending")
      .describe("Current status of this timeline event")
  })).optional().describe("Detailed timeline of plan execution")
});

// Micro Plan schema
export const MicroPlanSchema = BasePlanSchema.extend({
  _id: z.string().optional().describe("Unique identifier for the plan in the database"),
  type: z.literal(PlanType.Micro).default(PlanType.Micro).describe("Type of plan (micro)"),
  masterPlanId: z.string().describe("ID of the master plan this micro plan belongs to"),
  contentSeries: z.object({
    name: z.string().optional().describe("Name of the content series"),
    description: z.string().optional().describe("Description of the content series"),
    expectedPieces: z.number().optional().describe("Number of expected content pieces"),
    theme: z.string().optional().describe("Theme of the content series")
  }).optional().describe("Content series details for this micro plan"),
  performanceMetrics: z.array(z.object({
    metricName: z.string().describe("Name of the performance metric"),
    target: z.number().describe("Target value for this metric"),
    actual: z.number().optional().describe("Actual achieved value")
  })).optional().describe("Performance metrics for this micro plan")
});

// Combined Plan schema (union of Master and Micro)
export const PlanSchema = z.discriminatedUnion("type", [
  MasterPlanSchema,
  MicroPlanSchema
]);

// Master Plan creation schema for tools
export const MasterPlanCreationSchema = MasterPlanSchema.omit({
  _id: true,
  type: true,
  created_at: true,
  updated_at: true,
  state: true,
  stateMetadata: true,
  isActive: true
}).extend({
  campaignId: z.string().optional().describe("ID of the campaign this master plan belongs to"),
  campaignName: z.string().optional().describe("Name of the campaign this master plan belongs to"),
});

// Master Plan schema parser for tools
export const MasterPlanCreationSchemaParser = MasterPlanCreationSchema.refine(
  (data) => data.campaignId || data.campaignName,
  {
    message: "Either campaignId or campaignName must be provided"
  }
);

// Master Plan update schema for tools
export const MasterPlanUpdateSchema = MasterPlanCreationSchema.partial().extend({
  plan_id: z.string().optional().describe("ID of the plan to update"),
  plan_name: z.string().optional().describe("Name of the plan to update"),
  state: z.nativeEnum(PlanState).optional().default(PlanState.Draft)
    .describe("Current state of the plan: draft, review, approved, or active"),
  isActive: z.boolean().optional().default(false).describe("Whether this plan is currently active")
});

// Master Plan update schema parser for tools
export const MasterPlanUpdateSchemaParser = MasterPlanUpdateSchema.refine(
  (data) => data.plan_id || data.plan_name,
  {
    message: "Either plan_id or plan_name must be provided"
  }
);

// Micro Plan creation schema for tools
export const MicroPlanCreationSchema = MicroPlanSchema.omit({
  _id: true,
  type: true,
  created_at: true,
  updated_at: true,
  state: true,
  stateMetadata: true,
  isActive: true
}).extend({
  masterPlanId: z.string().optional().describe("ID of the master plan this micro plan belongs to"),
  masterPlanName: z.string().optional().describe("Name of the master plan this micro plan belongs to"),
});

// Micro Plan schema parser for tools
export const MicroPlanCreationSchemaParser = MicroPlanCreationSchema.refine(
  (data) => data.masterPlanId || data.masterPlanName,
  {
    message: "Either masterPlanId or masterPlanName must be provided"
  }
);

// Micro Plan update schema for tools
export const MicroPlanUpdateSchema = MicroPlanCreationSchema.partial().extend({
  plan_id: z.string().optional().describe("ID of the plan to update"),
  plan_name: z.string().optional().describe("Name of the plan to update"),
  state: z.nativeEnum(PlanState).optional().default(PlanState.Draft)
    .describe("Current state of the plan: draft, review, approved, or active"),
  isActive: z.boolean().optional().default(false).describe("Whether this plan is currently active")
});

// Micro Plan update schema parser for tools
export const MicroPlanUpdateSchemaParser = MicroPlanUpdateSchema.refine(
  (data) => data.plan_id || data.plan_name,
  {
    message: "Either plan_id or plan_name must be provided"
  }
);

// Type definitions
export type Plan = z.infer<typeof PlanSchema>;
export type MasterPlan = z.infer<typeof MasterPlanSchema>;
export type MicroPlan = z.infer<typeof MicroPlanSchema>;
export type MasterPlanCreationParams = z.infer<typeof MasterPlanCreationSchema>;
export type MicroPlanCreationParams = z.infer<typeof MicroPlanCreationSchema>;
export type MasterPlanUpdateParams = z.infer<typeof MasterPlanUpdateSchema>;
export type MicroPlanUpdateParams = z.infer<typeof MicroPlanUpdateSchema>;

// Base plan schema with common fields
// const BasePlanSchema = z.object({
//   _id: z.string().optional(),
//   title: z.string(),
//   type: z.nativeEnum(PlanType),
//   dateRange: z.object({
//     start: dateSchema,
//     end: dateSchema,
//   }),
//   goals: z.array(z.string()),
//   targetAudience: z.string(),
//   channels: z.array(z.string()),
//   state: z.nativeEnum(PlanState).default(PlanState.Draft),
//   stateMetadata: z.object({
//     version: z.number().default(1),
//     updatedAt: dateSchema.default(() => new Date()),
//     updatedBy: z.string(),
//     comments: z.string().optional(),
//   }),
//   isActive: z.boolean().default(false),
//   created_at: dateSchema.default(() => new Date()),
//   updated_at: dateSchema.default(() => new Date()),
// });

// // Master plan schema
// export const MasterPlanSchema = BasePlanSchema.extend({
//   type: z.literal(PlanType.Master),
//   campaignId: z.string(), // Required reference to parent campaign

//   // Content strategy
//   contentStrategy: z.object({
//     approach: z.string(),
//     keyThemes: z.array(z.string()),
//     distribution: z.record(z.string(), z.number()) // Channel: percentage
//   }).optional(),

//   // Detailed timeline
//   timeline: z.array(z.object({
//     date: dateSchema,
//     description: z.string(),
//     type: z.string(), // e.g., "Content Release", "Campaign Phase"
//     status: z.enum(['pending', 'in-progress', 'completed']).default('pending')
//   })).optional()
// });

// // Micro plan schema
// export const MicroPlanSchema = BasePlanSchema.extend({
//   type: z.literal(PlanType.Micro),
//   masterPlanId: z.string(), // Required reference to parent master plan

//   // Content series information
//   contentSeries: z.object({
//     name: z.string().optional(),
//     description: z.string().optional(),
//     expectedPieces: z.number().optional(),
//     theme: z.string().optional()
//   }).optional(),

//   // Content performance tracking
//   performanceMetrics: z.array(z.object({
//     metricName: z.string(),
//     target: z.number(),
//     actual: z.number().optional()
//   })).optional()
// });

// // Combined plan schema for database operations
// export const PlanSchema = z.discriminatedUnion("type", [
//   MasterPlanSchema,
//   MicroPlanSchema
// ]);

// // Export types
// export type Plan = z.infer<typeof PlanSchema>;
// export type MasterPlan = z.infer<typeof MasterPlanSchema>;
// export type MicroPlan = z.infer<typeof MicroPlanSchema>;
