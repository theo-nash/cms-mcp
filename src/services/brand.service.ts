import { Brand, BrandCreationParams, BrandGuidelines, BrandUpdateParams } from "../models/brand.model.js";
import { BrandRepository } from "../repositories/brand.repository.js";
import { deepMergeArrays, cleanNulls } from "../utils/merge.js";
import { deepMerge } from "../utils/merge.js";

export class BrandService {
    private brandRepository: BrandRepository;

    constructor() {
        this.brandRepository = new BrandRepository();
    }

    /**
     * Create a new brand
     */
    async createBrand(data: BrandCreationParams): Promise<Brand> {
        // Check if brand with same name already exists
        const existingBrand = await this.brandRepository.findByName(data.name);
        if (existingBrand) {
            throw new Error(`Brand with name "${data.name}" already exists`);
        }

        // Create the brand
        return await this.brandRepository.create(data as any);
    }

    /**
     * Get brand by ID
     */
    async getBrand(brandId: string): Promise<Brand | null> {
        const brand = await this.brandRepository.findById(brandId);
        if (!brand) return null;
        return brand;
    }

    /** 
     * Get brand by name
     */
    async getBrandByName(name: string): Promise<Brand | null> {
        const brand = await this.brandRepository.findByName(name);
        if (!brand) return null;
        return brand;
    }

    /**
     * Update brand
     */
    // In brand.service.ts
    async updateBrand(updates: Partial<BrandUpdateParams>): Promise<Brand | null> {
        // Ensure the existing brand is found
        let brand: Brand | null = null;
        if (updates.brandId) {
            brand = await this.getBrand(updates.brandId);
            if (!brand) {
                throw new Error(`Brand with ID "${updates.brandId}" not found`);
            }
        } else if (updates.brandName) {
            brand = await this.getBrandByName(updates.brandName);
            if (!brand) {
                throw new Error(`Brand with name "${updates.brandName}" not found`);
            }
        } else {
            throw new Error("Either brandId or brandName must be provided");
        }

        // Check for name uniqueness if updating name
        if (updates.brandName && updates.brandName !== brand.name) {
            const existingBrand = await this.brandRepository.findByName(updates.brandName);
            if (existingBrand && existingBrand._id !== updates.brandId) {
                throw new Error(`Brand with name "${updates.brandName}" already exists`);
            }
        }

        // Create a copy of updates to work with
        const processedUpdates = { ...updates };

        // Special handling for guidelines
        if (updates.guidelines) {
            const existingGuidelines = cleanNulls(brand.guidelines || {
                tone: [],
                vocabulary: [],
                avoidedTerms: [],
                visualIdentity: {},
                narratives: {},
                keyMessages: []
            });

            // Properly merge, keeping existing data when updates don't provide a value
            processedUpdates.guidelines = {
                // For arrays, use updates only if defined
                tone: updates.guidelines.tone !== undefined
                    ? updates.guidelines.tone
                    : existingGuidelines.tone,

                vocabulary: updates.guidelines.vocabulary !== undefined
                    ? updates.guidelines.vocabulary
                    : existingGuidelines.vocabulary,

                avoidedTerms: updates.guidelines.avoidedTerms !== undefined
                    ? updates.guidelines.avoidedTerms
                    : existingGuidelines.avoidedTerms,

                // Deep merge nested objects
                visualIdentity: updates.guidelines.visualIdentity
                    ? deepMerge(existingGuidelines.visualIdentity || {}, updates.guidelines.visualIdentity)
                    : existingGuidelines.visualIdentity,

                narratives: updates.guidelines.narratives
                    ? deepMerge(existingGuidelines.narratives || {}, updates.guidelines.narratives)
                    : existingGuidelines.narratives,

                // Merge arrays of objects using audienceSegment as key
                keyMessages: updates.guidelines.keyMessages
                    ? deepMergeArrays(
                        existingGuidelines.keyMessages || [],
                        updates.guidelines.keyMessages,
                        'audienceSegment'
                    )
                    : existingGuidelines.keyMessages,

                marketingPlan: updates.guidelines.marketingPlan
                    ? updates.guidelines.marketingPlan
                    : existingGuidelines.marketingPlan
            };
        }

        return await this.brandRepository.update(brand._id!, processedUpdates as any);
    }

    /**
     * Get all brands
     */
    async getAllBrands(): Promise<Brand[]> {
        const brands = await this.brandRepository.find({});
        return brands.map(cleanNulls);
    }

    /**
     * Update brand guidelines
     */
    async updateBrandGuidelines(brandId: string, guidelines: BrandGuidelines): Promise<Brand | null> {
        const brand = await this.brandRepository.update(brandId, { guidelines });
        if (!brand) return null;
        return cleanNulls(brand);
    }

    async addBrandKeyMessage(
        brandId: string,
        audienceSegment: string,
        message: string
    ): Promise<Brand | null> {
        const brand = await this.getBrand(brandId);
        if (!brand) return null;

        // Create or update guidelines
        const guidelines = brand.guidelines || {
            tone: [],
            vocabulary: [],
            avoidedTerms: [],
        };

        // Create or update key messages
        const keyMessages = guidelines.keyMessages || [];
        keyMessages.push({ audienceSegment, message });

        guidelines.keyMessages = keyMessages;

        // Update the brand
        const updatedBrand = await this.brandRepository.update(brandId, { guidelines });
        if (!updatedBrand) return null;
        return cleanNulls(updatedBrand);
    }

}