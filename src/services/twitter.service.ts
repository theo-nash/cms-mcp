import { TwitterClient } from "../channels/twitter/client.js";
import { Content } from "../models/content.model.js";
import { Brand } from "../models/brand.model.js";
import { BrandService } from "./brand.service.js";

export class TwitterService {
    private twitterClients: Map<string, TwitterClient> = new Map();
    private brandService: BrandService;

    constructor() {
        this.brandService = new BrandService();
    }

    /**
     * Get or create a Twitter client for a brand
     */
    async getClientForBrand(brandId: string): Promise<TwitterClient> {
        if (!brandId) throw new Error("Brand id must be provided");

        if (this.twitterClients.has(brandId)) {
            return this.twitterClients.get(brandId)!;
        }

        const twitterClient = new TwitterClient();

        // Get credentials from environment variables
        const username = process.env.TWITTER_USERNAME;
        const password = process.env.TWITTER_PASSWORD;
        const email = process.env.TWITTER_EMAIL;

        if (!username || !password || !email) {
            throw new Error("Twitter credentials are not set in environment variables");
        }

        this.twitterClients.set(brandId, twitterClient);
        return twitterClient;
    }

    /**
     * Publish content to Twitter
     */
    async publishContent(content: Content, brandId: string): Promise<{ id: string, url: string }> {
        try {
            const twitterClient = await this.getClientForBrand(brandId);
            const tweet = await twitterClient.sendTweet(content.content);
            return { id: tweet.id, url: tweet.permanentUrl };

        } catch (error) {
            console.error(`Failed to publish tweet for content ${content._id}:`, error);
            throw error;
        }
    }
}