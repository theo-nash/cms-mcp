import { z } from "zod";
import { dateSchema } from "../utils/date.utils.js";

// Brand Guidelines Schema
export const BrandGuidelinesSchema = z.object({
    tone: z.array(z.string()).describe("Tone descriptors that define the brand voice (e.g., Conversational, Professional)"),
    vocabulary: z.array(z.string()).describe("Key words and phrases to use frequently in brand communications"),
    avoidedTerms: z.array(z.string()).describe("Words and phrases to avoid in brand content"),
    visualIdentity: z.object({
        primaryColor: z.string().optional().describe("Primary brand color (hex code or name)"),
        secondaryColor: z.string().optional().describe("Secondary brand color (hex code or name)")
    }).optional().describe("Visual identity elements"),
    narratives: z.object({
        elevatorPitch: z.string().optional().describe("Short elevator pitch describing the brand"),
        shortNarrative: z.string().optional().describe("Brief brand narrative for medium-length communications"),
        fullNarrative: z.string().optional().describe("Full brand story/narrative for detailed communications")
    }).optional().describe("Brand narrative components at different lengths"),
    keyMessages: z.array(z.object({
        audienceSegment: z.string().describe("Target audience segment for this message"),
        message: z.string().describe("Key message for this specific audience segment")
    })).optional().describe("Key messages tailored to specific audience segments"),
    marketingPlan: z.string().optional().describe("Complete marketing plan for the brand")
});

// Base Brand Schema
export const BaseBrandSchema = z.object({
    name: z.string().min(1).describe("Name of the brand"),
    description: z.string().min(1).describe("Description of what the brand represents and its purpose"),
    guidelines: BrandGuidelinesSchema.optional().describe("Comprehensive brand guidelines")
});

// Full Brand Schema for database
export const BrandSchema = BaseBrandSchema.extend({
    _id: z.string().optional().describe("Unique identifier for the brand in the database"),
    created_at: dateSchema.default(() => new Date()).describe("When the brand was created"),
    updated_at: dateSchema.default(() => new Date()).describe("When the brand was last updated")
});

// Brand Creation Schema for tools
export const BrandCreationSchema = BaseBrandSchema;

// Brand Update Schema for tools
export const BaseBrandUpdateSchema = BaseBrandSchema.partial().extend({
    brandId: z.string().optional().describe("ID of the brand to update"),
    brandName: z.string().optional().describe("Name of the brand to update")
});

export const BrandUpdateSchema = BaseBrandUpdateSchema.refine(
    data => data.brandId || data.brandName,
    { message: "Either brandId or brandName must be provided" }
);

// Type definitions
export type Brand = z.infer<typeof BrandSchema>;
export type BrandGuidelines = z.infer<typeof BrandGuidelinesSchema>;
export type BrandCreationParams = z.infer<typeof BrandCreationSchema>;
export type BrandUpdateParams = z.infer<typeof BrandUpdateSchema>;

// // Twitter configuration schema
// export const TwitterConfigSchema = z.object({
//     username: z.string(),
//     password: z.string(),
//     email: z.string().email(),
//     // Optional API credentials
//     apiKey: z.string().optional(),
//     apiSecret: z.string().optional()
// });

// // Brand guidelines schema
// export const BrandGuidelinesSchema = z.object({
//     tone: z.array(z.string()).optional(),
//     vocabulary: z.array(z.string()).optional(),
//     avoidedTerms: z.array(z.string()).optional(),
//     visualIdentity: z.object({
//         primaryColor: z.string().optional(),
//         secondaryColor: z.string().optional()
//     }).optional(),
//     narratives: z.object({
//         elevatorPitch: z.string().optional(),
//         shortNarrative: z.string().optional(),
//         fullNarrative: z.string().optional(),
//     }).optional(),
//     keyMessages: z.array(z.object({
//         audienceSegment: z.string().optional(),
//         message: z.string().optional()
//     })).optional()
// });

// // Brand schema
// export const BrandSchema = z.object({
//     _id: z.string().optional(),
//     name: z.string(),
//     description: z.string(),
//     guidelines: BrandGuidelinesSchema.optional(),
//     created_at: dateSchema.default(() => new Date()),
//     updated_at: dateSchema.default(() => new Date()),
// });

// // Export types
// export type Brand = z.infer<typeof BrandSchema>;
// export type TwitterConfig = z.infer<typeof TwitterConfigSchema>;
// export type BrandGuidelines = z.infer<typeof BrandGuidelinesSchema>;