import { Brand, BrandGuidelines } from "../models/brand.model.js";
import { BrandRepository } from "../repositories/brand.repository.js";

export interface BrandCreationData {
    name: string;
    description: string;
    guidelines?: {
        tone: string[];
        vocabulary: string[];
        avoidedTerms: string[];
        visualIdentity?: {
            primaryColor?: string;
            secondaryColor?: string;
        };
        narratives?: {
            elevatorPitch?: string;
            shortNarrative?: string;
            fullNarrative?: string;
        };
        keyMessages?: Array<{
            audienceSegment: string;
            message: string;
        }>;
    };
}

export class BrandService {
    private brandRepository: BrandRepository;

    constructor() {
        this.brandRepository = new BrandRepository();
    }

    /**
     * Create a new brand
     */
    async createBrand(data: BrandCreationData): Promise<Brand> {
        // Check if brand with same name already exists
        const existingBrand = await this.brandRepository.findByName(data.name);
        if (existingBrand) {
            throw new Error(`Brand with name "${data.name}" already exists`);
        }

        // Create the brand
        return await this.brandRepository.create(data);
    }

    /**
     * Get brand by ID
     */
    async getBrand(brandId: string): Promise<Brand | null> {
        return await this.brandRepository.findById(brandId);
    }

    /** 
     * Get brand by name
     */
    async getBrandByName(name: string): Promise<Brand | null> {
        return await this.brandRepository.findByName(name);
    }

    /**
     * Update brand
     */
    // In brand.service.ts
    async updateBrand(brandId: string, updates: Partial<BrandCreationData>): Promise<Brand | null> {
        // If updating guidelines, handle the merge specially
        if (updates.guidelines) {
            const brand = await this.getBrand(brandId);
            if (!brand) return null;

            // If brand already has guidelines, merge them
            if (brand.guidelines) {
                // Create merged guidelines object with proper property handling
                updates.guidelines = {
                    // Use new values if provided, otherwise keep existing values
                    tone: updates.guidelines.tone ?? brand.guidelines.tone ?? [],
                    vocabulary: updates.guidelines.vocabulary ?? brand.guidelines.vocabulary ?? [],
                    avoidedTerms: updates.guidelines.avoidedTerms ?? brand.guidelines.avoidedTerms ?? [],

                    // Handle nested visualIdentity object
                    visualIdentity: updates.guidelines.visualIdentity
                        ? {
                            ...(brand.guidelines.visualIdentity || {}),
                            ...updates.guidelines.visualIdentity
                        }
                        : brand.guidelines.visualIdentity,

                    // Handle nested narratives object
                    narratives: updates.guidelines.narratives
                        ? {
                            ...(brand.guidelines.narratives || {}),
                            ...updates.guidelines.narratives
                        }
                        : brand.guidelines.narratives,

                    // Handle keyMessages array
                    keyMessages: updates.guidelines.keyMessages ?? brand.guidelines.keyMessages
                };
            }
        }

        return await this.brandRepository.update(brandId, updates);
    }

    /**
     * Get all brands
     */
    async getAllBrands(): Promise<Brand[]> {
        return await this.brandRepository.find({});
    }

    /**
     * Update brand guidelines
     */
    async updateBrandGuidelines(brandId: string, guidelines: BrandGuidelines): Promise<Brand | null> {
        return await this.brandRepository.update(brandId, { guidelines });
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
        return await this.brandRepository.update(brandId, { guidelines });
    }

}