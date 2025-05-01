import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BrandService } from "../../services/brand.service.js";
import { json } from "body-parser";
import { cleanNulls } from "../../utils/merge.js";
import { BaseBrandUpdateSchema, BrandCreationSchema, BrandUpdateSchema } from "../../models/brand.model.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { McpSchemaBuilder } from "../../utils/mcp-schema.js";

export function registerBrandTools(server: McpServer) {
    const brandService = new BrandService();

    // Create brand
    server.tool(
        "createBrand",
        "Creates a new brand entity in the CMS with optional brand guidelines. Use this when onboarding a new brand to establish its identity, tone, vocabulary, and visual standards. A brand serves as the foundation for all content, campaigns, and social media publications related to that entity. Required parameters: name and description. Optional: detailed guidelines including tone, vocabulary, terms to avoid, visual identity, narratives, and key messages.",
        BrandCreationSchema.shape,
        async (params) => {
            const brandData = BrandCreationSchema.parse(params);

            // Create the brand
            const result = await brandService.createBrand(brandData);

            return {
                content: [
                    {
                        type: "text",
                        text: `Brand "${params.name}" successfully created with ID: ${result._id}`
                    },
                    {
                        type: "text",
                        text: `The brand has ${result.guidelines ? 'guidelines defined for tone, vocabulary, and avoided terms' : 'no guidelines yet defined'}. You can reference this brand in other operations using either its ID or name.`
                    },
                    {
                        type: "text",
                        text: `Next steps: Create a campaign for this brand, develop content plans, or create standalone content.`
                    }
                ],
                brand_id: result._id,
                name: result.name,
                description: result.description,
                created_at: result.created_at.toISOString(),
                has_guidelines: !!result.guidelines,
                guideline_elements: result.guidelines ? Object.keys(result.guidelines) : []
            };
        }
    );

    // Get brand
    server.tool(
        "getBrand",
        "Retrieve details for a specific brand from the CMS by its ID or name, including its description and content guidelines. Use this to understand the brand's identity and standards.",
        {
            brandId: z.string().optional(),
            brandName: z.string().optional()
        },
        async (params) => {
            let brand;
            if (params.brandId) {
                brand = await brandService.getBrand(params.brandId);
            } else if (params.brandName) {
                brand = await brandService.getBrandByName(params.brandName);
            }

            if (!brand || !brand._id) {
                throw new Error(`Brand with ID ${params.brandId} not found`);
            }

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(brand)
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
                        text: JSON.stringify(brands)
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
        "updateBrand",
        "Update the brand. Use this to change the brand name, description, or guidelines (tone, vocabulary, avoided terms, visual identity, narratives, key messages). Either brandId or brandName must be provided (but cannot be modified).",
        BaseBrandUpdateSchema.shape,
        async (params) => {
            const updateData = BrandUpdateSchema.parse(params);

            // Find the brand
            let brand;
            if (updateData.brandId) {
                brand = await brandService.getBrand(updateData.brandId);
            } else if (updateData.brandName) {
                brand = await brandService.getBrandByName(updateData.brandName);
            }

            brand = cleanNulls(brand);

            if (!brand || !brand._id) {
                throw new Error(`Brand not found`);
            }

            // Update the brand
            const result = await brandService.updateBrand(updateData);

            if (!result) {
                throw new Error(`Brand with ID ${updateData.brandId} not found`);
            }

            return {
                content: [
                    {
                        type: "text",
                        text: `Brand guidelines updated for: ${result.name} (ID: ${brand._id})`
                    }
                ],
                brand_id: result._id,
                name: result.name,
                updated: true
            };
        }
    );
}