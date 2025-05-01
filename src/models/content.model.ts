import { z } from "zod";
import { dateSchema, optionalDateSchema } from "../utils/date.utils.js";

// Content states
export enum ContentState {
    Draft = "draft",
    Ready = "ready",
    Published = "published"
}

// Base Content Schema
export const BaseContentSchema = z.object({
    microPlanId: z.string().optional().describe("ID of the micro plan this content belongs to (if any)"),
    brandId: z.string().optional().describe("ID of the brand this content belongs to (for standalone content)"),
    title: z.string().min(1).describe("Title of the content piece - should be clear and engaging"),
    content: z.string().min(1).describe("The actual content text or body"),
    state: z.nativeEnum(ContentState).default(ContentState.Draft)
        .describe("Current state of the content: draft, ready for publishing, or published"),
    format: z.string().optional().describe("Format of the content (e.g., Article, Tweet, Video script)"),
    platform: z.string().optional().describe("Platform where this content will be published (e.g., Twitter, Medium)"),
    mediaRequirements: z.object({
        type: z.string().describe("Type of media required (e.g., Image, Video, Infographic)"),
        description: z.string().describe("Description of the media requirements")
    }).optional().describe("Requirements for media to accompany this content"),
    targetAudience: z.string().optional().describe("Specific target audience for this content piece"),
    keywords: z.array(z.string()).default([]).describe("Keywords relevant to this content for SEO and categorization"),
    publishedMetadata: z.object({
        url: z.string().optional().describe("URL where the content was published"),
        postId: z.string().optional().describe("ID or reference for the published post"),
        platformSpecificData: z.record(z.any()).optional().describe("Platform-specific metadata for the published content")
    }).optional().describe("Metadata about the published content"),
    stateMetadata: z.object({
        updatedAt: dateSchema.describe("When the content was last updated"),
        updatedBy: z.string().describe("User ID of who last updated the content"),
        comments: z.string().optional().describe("Additional notes about the most recent update"),
        scheduledFor: optionalDateSchema.describe("When the content is scheduled to be published (if applicable)"),
        publishedAt: optionalDateSchema.describe("When the content was actually published (if applicable)"),
        publishedUrl: z.string().optional().describe("URL where the content was published (if applicable)")
    }).describe("Metadata about content state and publishing")
});

// Full Content Schema for database
export const ContentSchema = BaseContentSchema.extend({
    _id: z.string().optional().describe("Unique identifier for the content in the database"),
    created_at: dateSchema.default(() => new Date()).describe("When the content was created"),
    updated_at: dateSchema.default(() => new Date()).describe("When the content was last modified")
});

// Content Creation Schema for tools
export const ContentCreationSchema = BaseContentSchema.omit({
    publishedMetadata: true,
    stateMetadata: true,
    state: true,
}).extend({
    microPlanId: z.string().optional().describe("ID of the micro plan this content belongs to (if part of a plan)"),
    brandName: z.string().optional().describe("Name of the brand this content belongs to (for standalone content). Either brandName or brandId must be provided for standalone content"),
    brandId: z.string().optional().describe("ID of the brand this content belongs to (for standalone content). Either brandName or brandId must be provided for standalone content"),
    scheduledFor: optionalDateSchema.describe("When the content is scheduled to be published (if applicable)")
});

// Tool input schema parser
export const ContentCreationSchemaParser = ContentCreationSchema.refine(
    data => data.microPlanId || data.brandName || data.brandId,
    { message: "Either microPlanId or brandName or brandId must be provided" }
);

// Content Update Schema for tools
export const ContentUpdateSchema = ContentCreationSchema.extend({
    content_id: z.string().describe("ID of the content to update")
});


// Type definitions
export type Content = z.infer<typeof ContentSchema>;
export type ContentCreationParams = z.infer<typeof ContentCreationSchema>;
export type ContentUpdateParams = z.infer<typeof ContentUpdateSchema>;

// // Content schema
// export const ContentSchema = z.object({
//     _id: z.string().optional(),
//     microPlanId: z.string().optional().default(""), // Make optional with default empty string
//     brandId: z.string().optional().default(""), // Add brandId for standalone content
//     title: z.string(),
//     content: z.string(),
//     state: z.nativeEnum(ContentState).default(ContentState.Draft),
//     format: z.string().optional(),
//     platform: z.string().optional(),
//     mediaRequirements: z.object({
//         type: z.string(),
//         description: z.string()
//     }).nullable().optional(),
//     targetAudience: z.string().optional(),
//     keywords: z.array(z.string()).optional(),
//     // Publication metadata
//     publishedMetadata: z.object({
//         url: z.string().optional(),
//         postId: z.string().optional(),
//         platformSpecificData: z.record(z.string(), z.any()).optional()
//     }).optional(),
//     stateMetadata: z.object({
//         updatedAt: dateSchema.default(() => new Date()),
//         updatedBy: z.string(),
//         comments: z.string().optional(),
//         scheduledFor: optionalDateSchema,
//         publishedAt: optionalDateSchema,
//         publishedUrl: z.string().optional()
//     }),
//     created_at: dateSchema.default(() => new Date()),
//     updated_at: dateSchema.default(() => new Date())
// }).refine(
//     data => data.microPlanId !== "" || data.brandId !== "",
//     {
//         message: "Content must be associated with either a microPlan or a brand",
//         path: ["microPlanId", "brandId"]
//     }
// );

// // Export type
// export type Content = z.infer<typeof ContentSchema>;