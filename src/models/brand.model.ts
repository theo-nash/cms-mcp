import { z } from "zod";

// Twitter configuration schema
export const TwitterConfigSchema = z.object({
    username: z.string(),
    password: z.string(),
    email: z.string().email(),
    // Optional API credentials
    apiKey: z.string().optional(),
    apiSecret: z.string().optional()
});

// Brand guidelines schema
export const BrandGuidelinesSchema = z.object({
    tone: z.array(z.string()),
    vocabulary: z.array(z.string()),
    avoidedTerms: z.array(z.string()),
    visualIdentity: z.object({
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional()
    }).optional(),
    narratives: z.object({
        elevatorPitch: z.string().optional(),
        shortNarrative: z.string().optional(),
        fullNarrative: z.string().optional(),
    }).optional(),
    keyMessages: z.array(z.object({
        audienceSegment: z.string(),
        message: z.string()
    })).optional()
});

// Brand schema
export const BrandSchema = z.object({
    _id: z.string().optional(),
    name: z.string(),
    description: z.string(),
    guidelines: BrandGuidelinesSchema.optional(),
    created_at: z.date().default(() => new Date()),
    updated_at: z.date().default(() => new Date())
});

// Export types
export type Brand = z.infer<typeof BrandSchema>;
export type TwitterConfig = z.infer<typeof TwitterConfigSchema>;
export type BrandGuidelines = z.infer<typeof BrandGuidelinesSchema>;