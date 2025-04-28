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

// Plan schema
export const PlanSchema = z.object({
  _id: z.string().optional(),
  brandId: z.string(),
  title: z.string(),
  type: z.nativeEnum(PlanType),
  parentPlanId: z.string().nullable().optional(), // For micro plans
  campaignId: z.string().nullable().optional(), // Link to campaign (only for master plans)
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

// Export type
export type Plan = z.infer<typeof PlanSchema>;
