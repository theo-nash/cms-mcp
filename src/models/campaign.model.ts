import { z } from "zod";

// Campaign status enum
export enum CampaignStatus {
  Draft = "draft",
  Active = "active",
  Completed = "completed",
  Archived = "archived"
}

export const CampaignSchema = z.object({
  _id: z.string().optional(),
  brandId: z.string().default("default-brand-id"), // Reference to parent brand with default
  name: z.string(),
  description: z.string().optional(),
  objectives: z.array(z.string()).optional(),
  startDate: z.union([z.string(), z.date()]).transform((val) => new Date(val)),
  endDate: z.union([z.string(), z.date()]).transform((val) => new Date(val)),
  goals: z.array(z.object({
    type: z.string(), // e.g., "Brand Awareness"
    description: z.string(),
    priority: z.number(),
    kpis: z.array(z.object({
      metric: z.string(),
      target: z.number()
    })),
    completionCriteria: z.string().optional()
  })).optional(),

  audience: z.array(z.object({
    segment: z.string(),
    characteristics: z.array(z.string()),
    painPoints: z.array(z.string())
  })).optional(),

  contentMix: z.array(z.object({
    category: z.string(),
    ratio: z.number(),
    platforms: z.array(z.object({
      name: z.string(),
      format: z.string()
    }))
  })).optional(),

  majorMilestones: z.array(z.object({
    date: z.union([z.string(), z.date()]).transform((val) => new Date(val)),
    description: z.string(),
    status: z.enum(['pending', 'completed']).default('pending')
  })).optional(),
  status: z.nativeEnum(CampaignStatus).default(CampaignStatus.Draft),
  stateMetadata: z.object({
    updatedAt: z.date().default(() => new Date()),
    updatedBy: z.string(),
    comments: z.string().optional()
  }).optional(),
  created_at: z.date().default(() => new Date()),
  updated_at: z.date().default(() => new Date()),
});

export type Campaign = z.infer<typeof CampaignSchema>;
