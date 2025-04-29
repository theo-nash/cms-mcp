import { Buffer } from 'buffer';
import {
    TwitterMcpError,
    TweetResponse,
    ProfileResponse,
    SearchResponse,
    FollowResponse,
    GrokChatResponse
} from './types.js';
import { AuthenticationManager } from './authentication.js';
import { formatTweet, formatProfile, formatSearch } from './formatters.js';
import { Profile, SearchMode } from 'agent-twitter-client';

/**
 * Manages a queue of requests with exponential backoff for rate limiting
 */
class RequestQueue {
    private queue: (() => Promise<any>)[] = [];
    private processing = false;

    async add<T>(request: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await request();
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
            this.processQueue();
        });
    }

    private async processQueue(): Promise<void> {
        if (this.processing || this.queue.length === 0) {
            return;
        }
        this.processing = true;

        while (this.queue.length > 0) {
            const request = this.queue.shift()!;
            try {
                await request();
            } catch (error) {
                console.error("Error processing request:", error);
                this.queue.unshift(request);
                await this.exponentialBackoff(this.queue.length);
            }
            await this.randomDelay();
        }

        this.processing = false;
    }

    private async exponentialBackoff(retryCount: number): Promise<void> {
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
    }

    private async randomDelay(): Promise<void> {
        const delay = Math.floor(Math.random() * 2000) + 1500;
        await new Promise((resolve) => setTimeout(resolve, delay));
    }
}

export class TwitterClient {
    private authManager: AuthenticationManager;
    private requestQueue: RequestQueue;
    private profile: Profile | null = null;

    constructor() {
        this.authManager = AuthenticationManager.getInstance();
        this.requestQueue = new RequestQueue();
    }

    /**
     * Get tweets from a user
     */
    async getUserTweets(
        username: string,
        count: number,
        includeReplies: boolean = false,
        includeRetweets: boolean = true
    ): Promise<TweetResponse[]> {
        try {
            const scraper = await this.authManager.getScraper();
            const tweets: any[] = await this.requestQueue.add(async () => {
                const tweetIterator = includeReplies
                    ? scraper.getTweets(username, count)
                    : scraper.getTweets(username, count);
                const tweets: any[] = [];
                for await (const tweet of tweetIterator) {
                    if (!includeRetweets && tweet.isRetweet) {
                        continue;
                    }
                    tweets.push(tweet);
                    if (tweets.length >= count) {
                        break;
                    }
                }
                return tweets;
            });
            return tweets.map(formatTweet);
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Get a tweet by ID
     */
    async getTweetById(
        id: string
    ): Promise<TweetResponse> {
        try {
            const scraper = await this.authManager.getScraper();
            const tweet = await this.requestQueue.add(() => scraper.getTweet(id));
            if (!tweet) {
                throw new TwitterMcpError(
                    `Tweet with ID ${id} not found`,
                    'tweet_not_found',
                    404
                );
            }
            return formatTweet(tweet);
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Get the timeline for the user
     */
    async getUserTimeline(count: number): Promise<TweetResponse[]> {
        try {
            const scraper = await this.authManager.getScraper();
            const tweets: any[] = await this.requestQueue.add(async () => {
                return await scraper.fetchHomeTimeline(count, []);
            });
            return tweets.map(formatTweet);
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Search for tweets
     */
    async searchTweets(
        query: string,
        count: number,
        searchMode: string = 'Top'
    ): Promise<SearchResponse> {
        try {
            const scraper = await this.authManager.getScraper();
            const mode = this.getSearchMode(searchMode);
            const tweets: any[] = await this.requestQueue.add(async () => {
                const tweets: any[] = [];
                for await (const tweet of scraper.searchTweets(query, count, mode)) {
                    tweets.push(tweet);
                    if (tweets.length >= count) {
                        break;
                    }
                }
                return tweets;
            });
            return formatSearch(query, tweets);
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Send a tweet
     */
    async sendTweet(
        text: string,
        replyToTweetId?: string,
        media?: { data: string; mediaType: string }[]
    ): Promise<TweetResponse> {
        try {
            const scraper = await this.authManager.getScraper();
            const processedMedia = media?.map(item => ({
                data: Buffer.from(item.data, 'base64'),
                mediaType: item.mediaType
            }));
            const response = await this.requestQueue.add(() =>
                scraper.sendTweet(text, replyToTweetId, processedMedia)
            );
            const responseText = await response.text();
            const responseData = JSON.parse(responseText);
            const tweetId = responseData?.data?.create_tweet?.tweet_results?.result?.rest_id;
            if (!tweetId) {
                throw new TwitterMcpError(
                    'Failed to extract tweet ID from response',
                    'tweet_creation_error',
                    500
                );
            }
            return await this.getTweetById(tweetId);
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Send a tweet with poll
     */
    async sendTweetWithPoll(
        text: string,
        poll: { options: { label: string }[]; durationMinutes: number },
        replyToTweetId?: string
    ): Promise<TweetResponse> {
        try {
            const scraper = await this.authManager.getScraper();
            const response = await this.requestQueue.add(() =>
                scraper.sendTweetV2(
                    text,
                    replyToTweetId,
                    { poll: { options: poll.options, duration_minutes: poll.durationMinutes } }
                )
            );
            if (!response?.id) {
                throw new TwitterMcpError(
                    'Failed to create tweet with poll',
                    'poll_creation_error',
                    500
                );
            }
            return await this.getTweetById(response.id);
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Like a tweet
     */
    async likeTweet(
        id: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            const scraper = await this.authManager.getScraper();
            await this.requestQueue.add(() => scraper.likeTweet(id));
            return {
                success: true,
                message: `Successfully liked tweet with ID ${id}`
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Retweet a tweet
     */
    async retweet(
        id: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            const scraper = await this.authManager.getScraper();
            await this.requestQueue.add(() => scraper.retweet(id));
            return {
                success: true,
                message: `Successfully retweeted tweet with ID ${id}`
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Quote a tweet
     */
    async quoteTweet(
        text: string,
        quotedTweetId: string,
        media?: { data: string; mediaType: string }[]
    ): Promise<TweetResponse> {
        try {
            const scraper = await this.authManager.getScraper();
            const processedMedia = media?.map(item => ({
                data: Buffer.from(item.data, 'base64'),
                mediaType: item.mediaType
            }));
            const response = await this.requestQueue.add(() =>
                scraper.sendQuoteTweet(
                    text,
                    quotedTweetId,
                    processedMedia ? { mediaData: processedMedia } : undefined
                )
            );
            const responseText = await response.text();
            const responseData = JSON.parse(responseText);
            const tweetId = responseData?.data?.create_tweet?.tweet_results?.result?.rest_id;
            if (!tweetId) {
                throw new TwitterMcpError(
                    'Failed to extract tweet ID from quote tweet response',
                    'quote_tweet_creation_error',
                    500
                );
            }
            return await this.getTweetById(tweetId);
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Get a user's profile
     */
    async getUserProfile(
        username: string
    ): Promise<ProfileResponse> {
        try {
            const scraper = await this.authManager.getScraper();
            const profile = await this.requestQueue.add(() => scraper.getProfile(username));
            return formatProfile(profile);
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Follow a user
     */
    async followUser(
        username: string
    ): Promise<FollowResponse> {
        try {
            const scraper = await this.authManager.getScraper();
            await this.requestQueue.add(() => scraper.followUser(username));
            return {
                success: true,
                message: `Successfully followed user @${username}`
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Get a user's followers
     */
    async getFollowers(
        userId: string,
        count: number
    ): Promise<ProfileResponse[]> {
        try {
            const scraper = await this.authManager.getScraper();
            const profiles: any[] = await this.requestQueue.add(async () => {
                const profiles: any[] = [];
                for await (const profile of scraper.getFollowers(userId, count)) {
                    profiles.push(profile);
                    if (profiles.length >= count) {
                        break;
                    }
                }
                return profiles;
            });
            return profiles.map(formatProfile);
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Get a user's following
     */
    async getFollowing(
        userId: string,
        count: number
    ): Promise<ProfileResponse[]> {
        try {
            const scraper = await this.authManager.getScraper();
            const profiles: any[] = await this.requestQueue.add(async () => {
                const profiles: any[] = [];
                for await (const profile of scraper.getFollowing(userId, count)) {
                    profiles.push(profile);
                    if (profiles.length >= count) {
                        break;
                    }
                }
                return profiles;
            });
            return profiles.map(formatProfile);
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Get a user's mentions
     */
    async getUserMentions(
        count: number
    ): Promise<TweetResponse[]> {
        const profile = await this.getProfile();
        return (await this.searchTweets(`@${profile.username}`, count, 'Latest')).tweets;
    }

    /**
     * Helper to convert string search mode to SearchMode enum
     */
    private getSearchMode(mode: string): any {
        switch (mode) {
            case 'Latest':
                return SearchMode.Latest;
            case 'Photos':
                return SearchMode.Photos;
            case 'Videos':
                return SearchMode.Videos;
            case 'Top':
            default:
                return SearchMode.Top;
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown): never {
        if (error instanceof TwitterMcpError) {
            throw error;
        }
        console.error('Twitter client error:', error);
        throw new TwitterMcpError(
            `Twitter client error: ${(error as Error).message}`,
            'twitter_client_error',
            500
        );
    }

    /**
     * Helper to get or set the profile 
     */
    async getProfile(): Promise<Profile> {
        if (!this.profile) {
            if (!process.env.TWITTER_USERNAME) {
                throw new TwitterMcpError(
                    'Twitter username not set',
                    'twitter_username_not_set',
                    500
                );
            }
            const scraper = await this.authManager.getScraper();
            this.profile = await this.requestQueue.add(async () => {
                const profile = await scraper.getProfile(process.env.TWITTER_USERNAME!);
                return profile;
            });
        }
        return this.profile;
    }
} 