import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BrandService } from "../../services/brand.service.js";

export function registerBrandTools(server: McpServer) {
    const brandService = new BrandService();

    // Create brand
    server.tool(
        "createBrand",
        "Create a new brand with within the CMS with Twitter credentials and optional brand guidelines. Use this to onboard a new brand into the CMS, including its social media configuration and content standards.",
        {
            name: z.string(),
            description: z.string(),
            guidelines: z.object({
                tone: z.array(z.string()),
                vocabulary: z.array(z.string()),
                avoided_terms: z.array(z.string()),
                visual_identity: z.object({
                    primary_color: z.string().optional(),
                    secondary_color: z.string().optional()
                }).optional()
            }).optional()
        },
        async (params) => {
            // Transform params to match service interface
            const brandData = {
                name: params.name,
                description: params.description,
                guidelines: params.guidelines ? {
                    tone: params.guidelines.tone,
                    vocabulary: params.guidelines.vocabulary,
                    avoidedTerms: params.guidelines.avoided_terms,
                    visualIdentity: params.guidelines.visual_identity ? {
                        primaryColor: params.guidelines.visual_identity.primary_color,
                        secondaryColor: params.guidelines.visual_identity.secondary_color
                    } : undefined
                } : undefined
            };

            // Create the brand
            const result = await brandService.createBrand(brandData);

            return {
                content: [
                    {
                        type: "text",
                        text: `Brand created: ${params.name} (ID: ${result._id})`
                    }
                ],
                brand_id: result._id,
                name: result.name
            };
        }
    );

    // Get brand
    server.tool(
        "getBrand",
        "Retrieve details for a specific brand from the CMS by its ID, including its description and content guidelines. Use this to understand the brand's identity and standards.",
        {
            brand_id: z.string()
        },
        async (params) => {
            const brand = await brandService.getBrand(params.brand_id);

            if (!brand) {
                throw new Error(`Brand with ID ${params.brand_id} not found`);
            }

            return {
                content: [
                    {
                        type: "text",
                        text: `Brand details retrieved: ${brand.name} (ID: ${params.brand_id})`
                    }
                ],
                brand_id: brand._id,
                name: brand.name,
                description: brand.description,
                guidelines: brand.guidelines ? {
                    tone: brand.guidelines.tone,
                    vocabulary: brand.guidelines.vocabulary,
                    avoided_terms: brand.guidelines.avoidedTerms
                } : null
            };
        }
    );

    // Get all brands
    server.tool(
        "getAllBrands",
        "List all brands currently registered in the CMS, including their names and descriptions.",
        {},
        async () => {
            const brands = await brandService.getAllBrands();

            return {
                content: [
                    {
                        type: "text",
                        text: `Retrieved ${brands.length} brands.`
                    }
                ],
                brands: brands.map(brand => ({
                    brand_id: brand._id,
                    name: brand.name,
                    description: brand.description
                }))
            };
        }
    );

    // Update brand guidelines
    server.tool(
        "updateBrandGuidelines",
        "Update the content guidelines for a specific brand. Use this to change tone, vocabulary, or visual identity standards for content associated with the brand.",
        {
            brand_id: z.string(),
            guidelines: z.object({
                tone: z.array(z.string()),
                vocabulary: z.array(z.string()),
                avoided_terms: z.array(z.string()),
                visual_identity: z.object({
                    primary_color: z.string().optional(),
                    secondary_color: z.string().optional()
                }).optional()
            })
        },
        async (params) => {
            // Transform params to match service interface
            const guidelines = {
                tone: params.guidelines.tone,
                vocabulary: params.guidelines.vocabulary,
                avoidedTerms: params.guidelines.avoided_terms,
                visualIdentity: params.guidelines.visual_identity ? {
                    primaryColor: params.guidelines.visual_identity.primary_color,
                    secondaryColor: params.guidelines.visual_identity.secondary_color
                } : undefined
            };

            // Update the brand guidelines
            const result = await brandService.updateBrandGuidelines(params.brand_id, guidelines);

            if (!result) {
                throw new Error(`Brand with ID ${params.brand_id} not found`);
            }

            return {
                content: [
                    {
                        type: "text",
                        text: `Brand guidelines updated for: ${result.name} (ID: ${params.brand_id})`
                    }
                ],
                brand_id: result._id,
                name: result.name,
                updated: true
            };
        }
    );
}