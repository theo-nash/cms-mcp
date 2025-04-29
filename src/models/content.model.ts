import { z } from "zod";

// Content states
export enum ContentState {
    Draft = "draft",
    Ready = "ready",
    Published = "published"
}

// Content schema
export const ContentSchema = z.object({
    _id: z.string().optional(),
    microPlanId: z.string().optional().default(""), // Make optional with default empty string
    brandId: z.string().optional().default(""), // Add brandId for standalone content
    title: z.string(),
    content: z.string(),
    state: z.nativeEnum(ContentState).default(ContentState.Draft),
    format: z.string().optional(),
    platform: z.string().optional(),
    mediaRequirements: z.object({
        type: z.string(),
        description: z.string()
    }).optional(),
    targetAudience: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    // Publication metadata
    publishedMetadata: z.object({
        url: z.string().optional(),
        postId: z.string().optional(),
        platformSpecificData: z.record(z.string(), z.any()).optional()
    }).optional(),
    stateMetadata: z.object({
        updatedAt: z.date().default(() => new Date()),
        updatedBy: z.string(),
        comments: z.string().optional(),
        scheduledFor: z.date().optional(),
        publishedAt: z.date().optional(),
        publishedUrl: z.string().optional()
    }),
    created_at: z.date().default(() => new Date()),
    updated_at: z.date().default(() => new Date())
}).refine(
    data => data.microPlanId !== "" || data.brandId !== "",
    {
        message: "Content must be associated with either a microPlan or a brand",
        path: ["microPlanId", "brandId"]
    }
);

// Export type
export type Content = z.infer<typeof ContentSchema>;