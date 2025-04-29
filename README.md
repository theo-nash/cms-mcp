# CMS-MCP Integration

A Content Management System (CMS) with Model Context Protocol (MCP) integration, providing both REST API and MCP interfaces for managing content, brands, campaigns, and social media publishing.

## Features

- **Content Management**: Create, schedule, and publish content across different brands
- **Brand Management**: Manage brand identities, guidelines, and social media configurations
- **Campaign Planning**: Create and manage content campaigns with micro and master plans
- **Social Media Integration**: Automated publishing to Twitter
- **Dual Interface**: 
  - REST API for traditional web applications
  - MCP interface for AI/LLM integration
- **Scheduled Publishing**: Automated content publishing based on schedules
- **Swagger Documentation**: Comprehensive API documentation

## Architecture

The system consists of several key components:

1. **REST API Server**: Express.js based API with Swagger documentation
2. **MCP Server**: Model Context Protocol server for AI/LLM integration
3. **Scheduler Service**: Handles automated content publishing
4. **Twitter Service**: Manages Twitter integration and publishing
5. **MongoDB Database**: Stores all system data

## Prerequisites

- Node.js 23.3.0 or higher
- Docker and Docker Compose
- MongoDB 6.0 or higher
- Twitter API credentials (for social media integration)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd cms-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with the following variables:
```env
MONGODB_URI=mongodb://localhost:27017/cms-mcp
SCHEDULER_INTERVAL=60000
API_PORT=3000
TWITTER_USERNAME=your_username
TWITTER_PASSWORD=your_password
TWITTER_EMAIL=your_email
```

## Running the System

There are multiple ways to run the CMS-MCP system depending on your needs:

### Complete System with Docker

To run the entire application (API server, scheduler, and MongoDB) in development mode:

```bash
docker-compose -f docker-compose-dev.yml up --build
```

For production:

```bash
docker-compose up --build
```

This will:
- Start MongoDB in a container
- Start the API server (main entry point in `src/index.ts`)
- Start the scheduler service
- Expose the API on port 3000

### Run API Server Only

If you already have MongoDB running, you can start just the API server:

```bash
npm run build
npm start
```

This executes the main entry point (`src/index.ts`), which starts the API server and scheduler.

### Run MCP Server Using Claude Desktop

The MCP server can now be run directly from Claude Desktop:

1. Make sure the main Docker container with MongoDB is already running:
```bash
docker-compose up
```

2. Create a `.env.mcp` file in the project root (optional, will fall back to `.env` if not found):
```env
MONGODB_URI=mongodb://localhost:27017/cms-mcp
NODE_ENV=development
TWITTER_USERNAME=your_username
TWITTER_PASSWORD=your_password
TWITTER_EMAIL=your_email
```

3. Run the MCP server script from Claude Desktop:
```bash
npm run build
node dist/mcp/index.js
```

The MCP server (`src/mcp/index.ts`) connects to the same MongoDB instance but runs independently from the API server.

### Run MCP Server In Docker (Standalone)

You can also run the MCP server in its own Docker container:

```bash
cd src/mcp
docker-compose -f docker-compose.mcp.yml up --build
```

Note: This setup requires MongoDB. You can either:
- Use the MongoDB from the main docker-compose setup
- Uncomment the MongoDB service in `docker-compose.mcp.yml` to run it alongside the MCP server

## API Documentation

Once the application is running, access the Swagger documentation at:
```
http://localhost:3000/api-docs
```

## API Endpoints

### Brands
- `GET /api/v1/brands` - List all brands
- `GET /api/v1/brands/:id` - Get brand by ID
- `POST /api/v1/brands` - Create new brand
- `PUT /api/v1/brands/:id` - Update brand

### Campaigns
- `GET /api/v1/campaigns` - List all campaigns
- `GET /api/v1/campaigns/:id` - Get campaign by ID
- `POST /api/v1/campaigns` - Create new campaign
- `PUT /api/v1/campaigns/:id` - Update campaign

### Plans
- `GET /api/v1/plans` - List all plans
- `GET /api/v1/plans/:id` - Get plan by ID
- `POST /api/v1/plans` - Create new plan
- `PUT /api/v1/plans/:id` - Update plan

### Content
- `GET /api/v1/content` - List all content
- `GET /api/v1/content/:id` - Get content by ID
- `POST /api/v1/content` - Create new content
- `PUT /api/v1/content/:id` - Update content

## MCP Tools

The system provides several MCP tools for AI/LLM integration:

### Brand Tools
- `createBrand` - Create a new brand
- `getBrand` - Retrieve brand details
- `getAllBrands` - List all brands
- `updateBrandGuidelines` - Update brand content guidelines

### Content Tools
- `createContent` - Create new content
- `getContent` - Retrieve content details
- `scheduleContent` - Schedule content for publishing
- `publishContent` - Publish content immediately

### Campaign Tools
- `createCampaign` - Create a new campaign
- `getCampaign` - Retrieve campaign details
- `addPlanToCampaign` - Add a plan to a campaign

### Plan Tools
- `createPlan` - Create a new plan
- `getPlan` - Retrieve plan details
- `addContentToPlan` - Add content to a plan

### Twitter Tools
- `getUserTweets` - Retrieve tweets from a specified Twitter user's timeline
- `getTweetById` - Retrieve a specific tweet by its ID
- `getUserTimeline` - Retrieve tweets from the authenticated user's home timeline
- `searchTweets` - Search for tweets matching a specific query
- `sendTweet` - Post a new tweet, optionally as a reply to another tweet
- `sendTweetWithPoll` - Post a new tweet with a poll attached
- `likeTweet` - Like a specific tweet
- `retweet` - Retweet a specific tweet
- `quoteTweet` - Quote a specific tweet with additional text
- `getUserProfile` - Retrieve a Twitter user's profile information
- `followUser` - Follow a specific Twitter user
- `getFollowers` - Retrieve a list of followers for a specific Twitter user
- `getFollowing` - Retrieve a list of users that a specific Twitter user is following
- `getUserMentions` - Retrieve tweets that mention the authenticated user
- `publishToTwitter` - Publish a content item directly to Twitter

## Database Schema

### Brand
```typescript
{
  _id: string;
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
  created_at: Date;
  updated_at: Date;
}
```

### Content
```typescript
{
  _id: string;
  microPlanId?: string;
  brandId?: string;
  title: string;
  content: string;
  state: "draft" | "ready" | "published";
  format?: string;
  platform?: string;
  mediaRequirements?: {
    type: string;
    description: string;
  };
  targetAudience?: string;
  keywords?: string[];
  publishedMetadata?: {
    url?: string;
    postId?: string;
    platformSpecificData?: Record<string, any>;
  };
  stateMetadata: {
    updatedAt: Date;
    updatedBy: string;
    comments?: string;
    scheduledFor?: Date;
    publishedAt?: Date;
    publishedUrl?: string;
  };
  created_at: Date;
  updated_at: Date;
}
```

### Campaign
```typescript
{
  _id: string;
  brandId: string;
  name: string;
  description?: string;
  objectives?: string[];
  startDate: Date;
  endDate: Date;
  goals?: Array<{
    type: string;
    description: string;
    priority: number;
    kpis: Array<{
      metric: string;
      target: number;
    }>;
    completionCriteria?: string;
  }>;
  audience?: Array<{
    segment: string;
    characteristics: string[];
    painPoints: string[];
  }>;
  contentMix?: Array<{
    category: string;
    ratio: number;
    platforms: Array<{
      name: string;
      format: string;
    }>;
  }>;
  majorMilestones?: Array<{
    date: Date;
    description: string;
    status: "pending" | "completed";
  }>;
  status: "draft" | "active" | "completed" | "archived";
  stateMetadata?: {
    updatedAt: Date;
    updatedBy: string;
    comments?: string;
  };
  created_at: Date;
  updated_at: Date;
}
```

### Plan
```typescript
{
  _id: string;
  title: string;
  type: "master" | "micro";
  dateRange: {
    start: Date;
    end: Date;
  };
  goals: string[];
  targetAudience: string;
  channels: string[];
  state: "draft" | "review" | "approved" | "active";
  stateMetadata: {
    version: number;
    updatedAt: Date;
    updatedBy: string;
    comments?: string;
  };
  isActive: boolean;
  
  // Master Plan specific fields (when type is "master")
  campaignId?: string;
  planGoals?: Array<{
    campaignGoalId: string;
    description: string;
    metrics: Array<{
      name: string;
      target: number;
    }>;
  }>;
  contentStrategy?: {
    approach: string;
    keyThemes: string[];
    distribution: Record<string, number>;
  };
  timeline?: Array<{
    date: Date;
    description: string;
    type: string;
    status: "pending" | "in-progress" | "completed";
  }>;
  
  // Micro Plan specific fields (when type is "micro")
  masterPlanId?: string;
  contentSeries?: {
    name?: string;
    description?: string;
    expectedPieces?: number;
    theme?: string;
  };
  performanceMetrics?: Array<{
    metricName: string;
    target: number;
    actual?: number;
  }>;
  
  created_at: Date;
  updated_at: Date;
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[Add your license information here]
