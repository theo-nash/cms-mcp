import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TwitterService } from "../../services/twitter.service.js";
import { BrandService } from "../../services/brand.service.js";
import { ContentService } from "../../services/content.service.js";
import { PlanService } from "../../services/plan.service.js";
import { CampaignService } from "../../services/campaign.service.js";
import { ContentState } from "../../models/content.model.js";
import { PlanType } from "../../models/plan.model.js";

export function registerTwitterTools(server: McpServer) {
    const twitterService = new TwitterService();
    const brandService = new BrandService();
    const contentService = new ContentService();
    const planService = new PlanService();
    const campaignService = new CampaignService();

    // Get tweets from a user
    server.tool(
        "getUserTweets",
        "Retrieve tweets from a specified Twitter user's timeline.",
        {
            username: z.string(),
            count: z.number().int().min(1).max(100).default(20),
            include_replies: z.boolean().default(false),
            include_retweets: z.boolean().default(true)
        },
        async (params) => {
            const twitterClient = await twitterService.getClientForBrand("default");
            const tweets = await twitterClient.getUserTweets(
                params.username,
                params.count,
                params.include_replies,
                params.include_retweets
            );

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(tweets)
                    }
                ],
                tweets: JSON.stringify(tweets)
            };
        }
    );

    // Get a tweet by ID
    server.tool(
        "getTweetById",
        "Retrieve a specific tweet by its ID.",
        {
            tweet_id: z.string()
        },
        async (params) => {
            const twitterClient = await twitterService.getClientForBrand("default");
            const tweet = await twitterClient.getTweetById(params.tweet_id);

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(tweet)
                    }
                ],
                tweet: JSON.stringify(tweet)
            };
        }
    );

    // Get user timeline
    server.tool(
        "getUserTimeline",
        "Retrieve tweets from the authenticated user's home timeline.",
        {
            count: z.number().int().min(1).max(100).default(20)
        },
        async (params) => {
            const twitterClient = await twitterService.getClientForBrand("default");
            const tweets = await twitterClient.getUserTimeline(params.count);

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(tweets)
                    }
                ],
                tweets: JSON.stringify(tweets)
            };
        }
    );

    // Search for tweets
    server.tool(
        "searchTweets",
        "Search for tweets matching a specific query.",
        {
            query: z.string(),
            count: z.number().int().min(1).max(100).default(20),
            search_mode: z.enum(["Top", "Latest", "Photos", "Videos"]).default("Top")
        },
        async (params) => {
            const twitterClient = await twitterService.getClientForBrand("default");
            const searchResults = await twitterClient.searchTweets(
                params.query,
                params.count,
                params.search_mode
            );

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(searchResults.tweets)
                    }
                ],
                tweets: JSON.stringify(searchResults.tweets),
                query: searchResults.query
            };
        }
    );

    // Send a tweet
    server.tool(
        "sendTweet",
        "Post a new tweet, optionally as a reply to another tweet.",
        {
            text: z.string().max(280),
            reply_to_tweet_id: z.string().optional(),
            media: z.array(z.object({
                data: z.string(),
                mediaType: z.string()
            })).optional()
        },
        async (params) => {
            const twitterClient = await twitterService.getClientForBrand("default");
            const tweet = await twitterClient.sendTweet(
                params.text,
                params.reply_to_tweet_id,
                params.media
            );

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(tweet)
                    }
                ],
                tweet: JSON.stringify(tweet)
            };
        }
    );

    // Send a tweet with poll
    server.tool(
        "sendTweetWithPoll",
        "Post a new tweet with a poll attached.",
        {
            text: z.string().max(280),
            poll: z.object({
                options: z.array(z.object({
                    label: z.string().max(25)
                })).min(2).max(4),
                durationMinutes: z.number().int().min(5).max(10080)
            }),
            reply_to_tweet_id: z.string().optional()
        },
        async (params) => {
            const twitterClient = await twitterService.getClientForBrand("default");
            const tweet = await twitterClient.sendTweetWithPoll(
                params.text,
                params.poll,
                params.reply_to_tweet_id
            );

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(tweet)
                    }
                ],
                tweet: JSON.stringify(tweet)
            };
        }
    );

    // Like a tweet
    server.tool(
        "likeTweet",
        "Like a specific tweet.",
        {
            tweet_id: z.string()
        },
        async (params) => {
            const twitterClient = await twitterService.getClientForBrand("default");
            const result = await twitterClient.likeTweet(params.tweet_id);

            return {
                content: [
                    {
                        type: "text",
                        text: result.message
                    }
                ],
                success: result.success
            };
        }
    );

    // Retweet a tweet
    server.tool(
        "retweet",
        "Retweet a specific tweet.",
        {
            tweet_id: z.string()
        },
        async (params) => {
            const twitterClient = await twitterService.getClientForBrand("default");
            const result = await twitterClient.retweet(params.tweet_id);

            return {
                content: [
                    {
                        type: "text",
                        text: result.message
                    }
                ],
                success: result.success
            };
        }
    );

    // Quote a tweet
    server.tool(
        "quoteTweet",
        "Quote a specific tweet with additional text.",
        {
            text: z.string().max(280),
            quoted_tweet_id: z.string(),
            media: z.array(z.object({
                data: z.string(),
                mediaType: z.string()
            })).optional()
        },
        async (params) => {
            const twitterClient = await twitterService.getClientForBrand("default");
            const tweet = await twitterClient.quoteTweet(
                params.text,
                params.quoted_tweet_id,
                params.media
            );

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(tweet)
                    }
                ],
                tweet: JSON.stringify(tweet)
            };
        }
    );

    // Get a user's profile
    server.tool(
        "getUserProfile",
        "Retrieve a Twitter user's profile information.",
        {
            username: z.string()
        },
        async (params) => {
            const twitterClient = await twitterService.getClientForBrand("default");
            const profile = await twitterClient.getUserProfile(params.username);

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(profile)
                    }
                ],
                profile: JSON.stringify(profile)
            };
        }
    );

    // Follow a user
    server.tool(
        "followUser",
        "Follow a specific Twitter user.",
        {
            username: z.string()
        },
        async (params) => {
            const twitterClient = await twitterService.getClientForBrand("default");
            const result = await twitterClient.followUser(params.username);

            return {
                content: [
                    {
                        type: "text",
                        text: result.message
                    }
                ],
                success: result.success
            };
        }
    );

    // Get a user's followers
    server.tool(
        "getFollowers",
        "Retrieve a list of followers for a specific Twitter user.",
        {
            user_id: z.string(),
            count: z.number().int().min(1).max(100).default(20)
        },
        async (params) => {
            const twitterClient = await twitterService.getClientForBrand("default");
            const profiles = await twitterClient.getFollowers(params.user_id, params.count);

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(profiles)
                    }
                ],
                followers: JSON.stringify(profiles)
            };
        }
    );

    // Get a user's following
    server.tool(
        "getFollowing",
        "Retrieve a list of users that a specific Twitter user is following.",
        {
            user_id: z.string(),
            count: z.number().int().min(1).max(100).default(20)
        },
        async (params) => {
            const twitterClient = await twitterService.getClientForBrand("default");
            const profiles = await twitterClient.getFollowing(params.user_id, params.count);

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(profiles)
                    }
                ],
                following: JSON.stringify(profiles)
            };
        }
    );

    // Get a user's mentions
    server.tool(
        "getUserMentions",
        "Retrieve tweets that mention the authenticated user.",
        {
            count: z.number().int().min(1).max(100).default(20)
        },
        async (params) => {
            const twitterClient = await twitterService.getClientForBrand("default");
            const tweets = await twitterClient.getUserMentions(params.count);

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(tweets)
                    }
                ],
                mentions: JSON.stringify(tweets)
            };
        }
    );

    // Publish content to Twitter
    server.tool(
        "publishToTwitter",
        "Publishes a content item directly to Twitter and transitions it to 'published' state. Only content in 'ready' state can be published. The system determines the appropriate Twitter account based on the content's brand association. After publication, the tweet URL and ID are stored with the content.\n\nExample: publishToTwitter(content_id: \"507f1f77bcf86cd799439011\", user_id: \"user123\")",
        {
            content_id: z.string().describe("ID of the content to publish (required)"),
            user_id: z.string().describe("ID of the user initiating the publication (required)")
        },
        async (params) => {
            // Get the content
            const content = await contentService.getContent(params.content_id);
            if (!content) {
                throw new Error(`Content with ID ${params.content_id} not found`);
            }

            // Verify content is in Ready state
            if (content.state !== ContentState.Ready) {
                throw new Error(`Content must be in 'ready' state to be published`);
            }

            let brandId = "";

            // Determine brand ID from either direct association or through hierarchy
            if (content.brandId) {
                // Content is directly associated with a brand
                brandId = content.brandId;
            } else if (content.microPlanId) {
                // Content is associated with a microplan, follow the hierarchy
                const microPlan = await planService.getPlan(content.microPlanId);
                if (!microPlan || microPlan.type !== PlanType.Micro) {
                    throw new Error(`Micro plan with ID ${content.microPlanId} not found`);
                }

                // Get the master plan
                const masterPlan = await planService.getPlan(microPlan.masterPlanId);
                if (!masterPlan || masterPlan.type !== PlanType.Master) {
                    throw new Error(`Master plan with ID ${microPlan.masterPlanId} not found`);
                }

                // Get the campaign
                const campaign = await campaignService.getCampaignById(masterPlan.campaignId);
                if (!campaign) {
                    throw new Error(`Campaign with ID ${masterPlan.campaignId} not found`);
                }

                brandId = campaign.brandId;
            } else {
                throw new Error('Content must be associated with either a microplan or a brand');
            }

            // Get the brand
            const brand = await brandService.getBrand(brandId);
            if (!brand) {
                throw new Error(`Brand with ID ${brandId} not found`);
            }

            // Publish to Twitter
            const result = await twitterService.publishContent(content, brand._id!);

            // Update content state and metadata
            const updatedContent = await contentService.transitionContentState(
                content._id!,
                ContentState.Published,
                {
                    userId: params.user_id,
                    comments: `Published to Twitter: ${result.url}`
                }
            );

            if (!updatedContent) {
                throw new Error(`Failed to update content state after publishing`);
            }

            return {
                content: [
                    {
                        type: "text",
                        text: `Content "${content.title}" successfully published to Twitter`
                    },
                    {
                        type: "text",
                        text: `Tweet URL: ${result.url}`
                    },
                    {
                        type: "text",
                        text: JSON.stringify(updatedContent)
                    }
                ],
                content_id: content._id,
                content_title: content.title,
                previous_state: ContentState.Ready,
                current_state: ContentState.Published,
                tweet_id: result.id,
                tweet_url: result.url,
                brand_id: brandId,
                brand_name: brand.name,
                publishing_user_id: params.user_id,
                published_at: updatedContent.stateMetadata.publishedAt?.toISOString(),
                character_count: content.content.length
            };
        }
    );
}