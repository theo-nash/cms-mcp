import { Brand, BrandGuidelines } from "../models/brand.model.js";
import { BrandRepository } from "../repositories/brand.repository.js";

export interface BrandCreationData {
    name: string;
    description: string;
    guidelines?: BrandGuidelines;
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
     * Update brand
     */
    async updateBrand(brandId: string, updates: Partial<BrandCreationData>): Promise<Brand | null> {
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
}