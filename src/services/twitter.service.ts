import { Scraper } from "agent-twitter-client";
import { Content } from "../models/content.model.js";
import { Brand } from "../models/brand.model.js";

export class TwitterService {
    private scraperCache: Map<string, Scraper> = new Map();

    /**
     * Get or create a Twitter client for a brand
     */
    private async getClientForBrand(brand: Brand): Promise<Scraper> {
        if (!brand._id) throw new Error("Brand must have an _id");

        if (this.scraperCache.has(brand._id)) {
            return this.scraperCache.get(brand._id)!;
        }

        const scraper = new Scraper();

        // Get credentials from environment variables
        const username = process.env.TWITTER_USERNAME;
        const password = process.env.TWITTER_PASSWORD;
        const email = process.env.TWITTER_EMAIL;

        if (!username || !password || !email) {
            throw new Error("Twitter credentials are not set in environment variables");
        }

        this.scraperCache.set(brand._id, scraper);
        return scraper;
    }

    /**
     * Publish content to Twitter
     */
    async publishContent(content: Content, brand: Brand): Promise<{ id: string, url: string }> {
        try {
            // For testing only
            return {
                id: "TestId",
                url: "testURL"
            }

            const scraper = await this.getClientForBrand(brand);
            const response = await scraper.sendTweet(content.content);

            const responseText = await response.text();
            const responseData = JSON.parse(responseText);
            const tweetId = responseData?.data?.create_tweet?.tweet_results?.result?.rest_id;

            return {
                id: tweetId,
                url: `Demonstration`
            };
        } catch (error) {
            console.error(`Failed to publish tweet for content ${content._id}:`, error);
            throw error;
        }
    }
}