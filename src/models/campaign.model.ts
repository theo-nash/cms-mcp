import { z } from "zod";
import { dateSchema, optionalDateSchema } from "../utils/date.utils.js";

// Campaign status enum
export enum CampaignStatus {
  Draft = "draft",
  Active = "active",
  Completed = "completed",
  Archived = "archived"
}

// Base schema with all common fields
export const BaseCampaignSchema = z.object({
  brandId: z.string().describe("The brand ID this campaign belongs to"),
  name: z.string().min(1).describe("Name of the campaign - should be concise and memorable"),
  description: z.string().describe("Detailed description of the campaign's purpose and approach"),
  objectives: z.array(z.string()).default([]).describe("List of key objectives this campaign aims to achieve"),
  startDate: dateSchema.describe("When the campaign begins, in ISO format or Date object"),
  endDate: dateSchema.describe("When the campaign ends, in ISO format or Date object"),
  status: z.enum(["draft", "active", "completed", "archived"]).default(CampaignStatus.Draft)
    .describe("Current status of the campaign: draft (in planning), active (running), completed (finished), or archived (inactive)"),
  goals: z.array(z.object({
    type: z.string().describe("Category of goal (e.g., Awareness, Conversion, Education)"),
    description: z.string().describe("Detailed description of what this goal aims to achieve"),
    priority: z.number().int().min(1).describe("Priority ranking (1 is highest priority)"),
    kpis: z.array(z.object({
      metric: z.string().describe("Name of the measurable metric for this KPI"),
      target: z.number().describe("Target value to achieve for this KPI")
    })).describe("Key Performance Indicators for measuring this goal"),
    completionCriteria: z.string().optional().describe("Qualitative criteria for determining when this goal is met")
  })).default([]).describe("Detailed campaign goals with KPIs and completion criteria"),
  audience: z.array(z.object({
    segment: z.string().describe("Name of the audience segment (e.g., Developers, Investors)"),
    characteristics: z.array(z.string()).describe("Key traits that define this audience segment"),
    painPoints: z.array(z.string()).describe("Problems this audience faces that the campaign addresses")
  })).optional().describe("Target audience segments with their characteristics and pain points"),
  contentMix: z.array(z.object({
    category: z.string().describe("Content category (e.g., Educational, Visual, Technical)"),
    ratio: z.number().min(0).max(1).describe("Proportion of campaign content in this category (0-1)"),
    platforms: z.array(z.object({
      name: z.string().describe("Platform name (e.g., Twitter, GitHub)"),
      format: z.string().describe("Content format for this platform (e.g., Threads, Articles)")
    })).describe("Platforms and formats for delivering this content category")
  })).optional().describe("Content mix strategy defining types, proportions, and platforms"),
  majorMilestones: z.array(z.object({
    date: optionalDateSchema.describe("Target date for this milestone (optional)"),
    description: z.string().describe("Description of what this milestone represents"),
    status: z.enum(["pending", "completed"]).default("pending")
      .describe("Current status of this milestone")
  })).default([]).describe("Major campaign milestones with dates and completion status"),
  stateMetadata: z.object({
    updatedBy: z.string().describe("User ID of who last updated the campaign"),
    comments: z.string().default("").describe("Additional notes about the most recent update")
  }).default(() => ({
    updatedBy: "system",
    comments: ""
  })).describe("Metadata about campaign state changes"),
  // Versioning fields
  version: z.number().int().min(1).default(1).describe("Version number of this campaign"),
  isActive: z.boolean().default(true).describe("Whether this is the active version of the campaign"),
  previousVersionId: z.string().optional().describe("ID of the previous version of this campaign"),
  rootCampaignId: z.string().optional().describe("ID of the original root campaign this version is derived from")
});

// Database model schema adds DB-specific fields
export const CampaignSchema = BaseCampaignSchema.extend({
  _id: z.string().optional().describe("Unique identifier for the campaign in the database"),
  created_at: dateSchema.default(() => new Date()).describe("When the campaign was created"),
  updated_at: dateSchema.default(() => new Date()).describe("When the campaign was last modified")
});

// Tool input schema for creating campaigns
export const CampaignCreationSchema = BaseCampaignSchema.omit({
  status: true, // Status is set automatically
  stateMetadata: true,
  // Omit versioning fields for creation
  version: true,
  isActive: true,
  previousVersionId: true,
  rootCampaignId: true
}).extend({
  brandId: z.string().optional().describe("ID of the brand this campaign belongs to (either brandId or brandName required)"),
  brandName: z.string().optional().describe("Name of the brand this campaign belongs to (either brandId or brandName required)")
});

// Tool input schema parser
export const CampaignCreationSchemaParser = CampaignCreationSchema.refine(
  data => data.brandId || data.brandName,
  { message: "Either brandId or brandName must be provided" }
);

// Campaign Update Schema for tools 
export const CampaignUpdateSchema = BaseCampaignSchema.partial().omit({
  brandId: true,
  // Omit versioning fields for updates
  version: true,
  isActive: true,
  previousVersionId: true,
  rootCampaignId: true
}).extend({
  campaign_id: z.string().describe("ID of the campaign to update"),
  create_new_version: z.boolean().optional().default(false).describe("Whether to create a new version when updating"),
  stateMetadata: z.object({
    updatedBy: z.string().optional().describe("User ID updating the campaign"),
    comments: z.string().optional().describe("Additional notes about the most recent update")
  }).optional().describe("Metadata about campaign state changes"),
});

// Type definitions
export type Campaign = z.infer<typeof CampaignSchema>;
export type CampaignCreationParams = z.infer<typeof CampaignCreationSchema>;
export type CampaignUpdateParams = z.infer<typeof CampaignUpdateSchema>;

// export const CampaignSchema = z.object({
//   _id: z.string().optional(),
//   brandId: z.string().default("default-brand-id"), // Reference to parent brand with default
//   name: z.string(),
//   description: z.string().optional(),
//   objectives: z.array(z.string()).optional(),
//   startDate: dateSchema,
//   endDate: dateSchema,
//   goals: z.array(z.object({
//     type: z.string(), // e.g., "Brand Awareness"
//     description: z.string(),
//     priority: z.number(),
//     kpis: z.array(z.object({
//       metric: z.string(),
//       target: z.number()
//     })),
//     completionCriteria: z.string().optional()
//   })).optional(),

//   audience: z.array(z.object({
//     segment: z.string(),
//     characteristics: z.array(z.string()),
//     painPoints: z.array(z.string())
//   })).optional(),

//   contentMix: z.array(z.object({
//     category: z.string(),
//     ratio: z.number(),
//     platforms: z.array(z.object({
//       name: z.string(),
//       format: z.string()
//     }))
//   })).optional(),

//   majorMilestones: z.array(z.object({
//     date: optionalDateSchema,
//     description: z.string(),
//     status: z.enum(['pending', 'completed']).default('pending')
//   })).default([]),
//   status: z.nativeEnum(CampaignStatus).default(CampaignStatus.Draft),
//   stateMetadata: z.object({
//     updatedAt: dateSchema.default(() => new Date()),
//     updatedBy: z.string(),
//     comments: z.string().optional()
//   }).optional(),
//   created_at: dateSchema.default(() => new Date()),
//   updated_at: dateSchema.default(() => new Date()),
// });

// export type Campaign = z.infer<typeof CampaignSchema>;
