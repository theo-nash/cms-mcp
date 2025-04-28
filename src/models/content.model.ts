import { z } from "zod";

// Content states (simplified for MVP)
export enum ContentState {
    Draft = "draft",
    Ready = "ready",
    Published = "published"
}

// Content schema
export const ContentSchema = z.object({
    _id: z.string().optional(),
    planId: z.string(),
    brandId: z.string(),
    title: z.string(),
    content: z.string(),
    state: z.nativeEnum(ContentState).default(ContentState.Draft),
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
});

// Export type
export type Content = z.infer<typeof ContentSchema>;