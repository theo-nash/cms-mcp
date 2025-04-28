import swaggerUi from "swagger-ui-express";
import { Express } from "express";
import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Content Management System API",
      version: "1.0.0",
      description: "API documentation for the Content Management System",
    },
    servers: [
      {
        url: "/api/v1",
        description: "Development server",
      },
    ],
    components: {
      schemas: {
        Campaign: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Unique identifier of the campaign",
            },
            name: {
              type: "string",
              description: "Name of the campaign",
            },
            description: {
              type: "string",
              description: "Description of the campaign",
            },
            startDate: {
              type: "string",
              format: "date-time",
              description: "Start date of the campaign",
            },
            endDate: {
              type: "string",
              format: "date-time",
              description: "End date of the campaign",
            },
            objectives: {
              type: "array",
              items: {
                type: "string",
                description: "Campaign objective",
              },
              description: "List of campaign objectives",
            },
            status: {
              type: "string",
              enum: ["draft", "active", "completed", "archived"],
              description: "Current status of the campaign",
            },
            userId: {
              type: "string",
              description: "ID of the user who created/updated the campaign",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Timestamp when the campaign was created",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Timestamp when the campaign was last updated",
            },
          },
          required: ["name", "description", "startDate", "endDate", "userId"],
        },
        Plan: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Unique identifier of the plan",
            },
            brandId: {
              type: "string",
              description: "ID of the associated brand",
            },
            title: {
              type: "string",
              description: "Title of the plan",
            },
            type: {
              type: "string",
              enum: ["master", "micro"],
              description: "Type of the plan",
            },
            parentPlanId: {
              type: "string",
              description: "ID of the parent plan (for micro plans)",
            },
            campaignId: {
              type: "string",
              description: "ID of the associated campaign",
            },
            dateRange: {
              type: "object",
              description: "Date range for the plan",
              properties: {
                start: {
                  type: "string",
                  format: "date-time",
                  description: "Start date",
                },
                end: {
                  type: "string",
                  format: "date-time",
                  description: "End date",
                },
              },
            },
            goals: {
              type: "array",
              items: {
                type: "string",
                description: "Plan goal",
              },
              description: "List of plan goals",
            },
            targetAudience: {
              type: "string",
              description: "Target audience description",
            },
            channels: {
              type: "array",
              items: {
                type: "string",
                description: "Channel",
              },
              description: "List of channels to be used",
            },
            state: {
              type: "string",
              enum: ["draft", "review", "approved", "active"],
              description: "Current state of the plan",
            },
            userId: {
              type: "string",
              description: "ID of the user who created/updated the plan",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Timestamp when the plan was created",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Timestamp when the plan was last updated",
            },
          },
          required: ["brandId", "title", "type", "dateRange", "goals", "targetAudience", "channels", "userId"],
        },
        Content: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Unique identifier of the content",
            },
            planId: {
              type: "string",
              description: "ID of the associated plan",
            },
            brandId: {
              type: "string",
              description: "ID of the associated brand",
            },
            title: {
              type: "string",
              description: "Title of the content",
            },
            content: {
              type: "string",
              description: "Content body",
            },
            state: {
              type: "string",
              enum: ["draft", "ready", "published"],
              description: "Current state of the content",
            },
            scheduledFor: {
              type: "string",
              format: "date-time",
              description: "Scheduled publication date",
            },
            publishedAt: {
              type: "string",
              format: "date-time",
              description: "Actual publication date",
            },
            publishedUrl: {
              type: "string",
              description: "URL where the content is published",
            },
            userId: {
              type: "string",
              description: "ID of the user who created/updated the content",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Timestamp when the content was created",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Timestamp when the content was last updated",
            },
          },
          required: ["planId", "brandId", "title", "content", "userId"],
        },
        Brand: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Unique identifier of the brand",
            },
            name: {
              type: "string",
              description: "Name of the brand",
            },
            description: {
              type: "string",
              description: "Description of the brand",
            },
            guidelines: {
              type: "object",
              description: "Brand guidelines",
              properties: {
                tone: {
                  type: "array",
                  items: {
                    type: "string",
                    description: "Tone guideline",
                  },
                  description: "List of tone guidelines",
                },
                vocabulary: {
                  type: "array",
                  items: {
                    type: "string",
                    description: "Vocabulary guideline",
                  },
                  description: "List of vocabulary guidelines",
                },
                avoidedTerms: {
                  type: "array",
                  items: {
                    type: "string",
                    description: "Term to avoid",
                  },
                  description: "List of terms to avoid",
                },
                visualIdentity: {
                  type: "object",
                  description: "Visual identity guidelines",
                  properties: {
                    primaryColor: {
                      type: "string",
                      description: "Primary brand color",
                    },
                    secondaryColor: {
                      type: "string",
                      description: "Secondary brand color",
                    },
                  },
                },
              },
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Timestamp when the brand was created",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Timestamp when the brand was last updated",
            },
          },
          required: ["name", "description"],
        },
        CampaignUpdate: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Name of the campaign",
            },
            description: {
              type: "string",
              description: "Description of the campaign",
            },
            startDate: {
              type: "string",
              format: "date-time",
              description: "Start date of the campaign",
            },
            endDate: {
              type: "string",
              format: "date-time",
              description: "End date of the campaign",
            },
            objectives: {
              type: "array",
              items: {
                type: "string",
                description: "Campaign objective",
              },
              description: "List of campaign objectives",
            },
            status: {
              type: "string",
              enum: ["draft", "active", "completed", "archived"],
              description: "Current status of the campaign",
            },
            userId: {
              type: "string",
              description: "ID of the user updating the campaign",
            },
          },
        },
        BrandUpdate: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Name of the brand",
            },
            description: {
              type: "string",
              description: "Description of the brand",
            },
            guidelines: {
              type: "object",
              description: "Brand guidelines",
              properties: {
                tone: {
                  type: "array",
                  items: {
                    type: "string",
                    description: "Tone guideline",
                  },
                  description: "List of tone guidelines",
                },
                vocabulary: {
                  type: "array",
                  items: {
                    type: "string",
                    description: "Vocabulary guideline",
                  },
                  description: "List of vocabulary guidelines",
                },
                avoidedTerms: {
                  type: "array",
                  items: {
                    type: "string",
                    description: "Term to avoid",
                  },
                  description: "List of terms to avoid",
                },
                visualIdentity: {
                  type: "object",
                  description: "Visual identity guidelines",
                  properties: {
                    primaryColor: {
                      type: "string",
                      description: "Primary brand color",
                    },
                    secondaryColor: {
                      type: "string",
                      description: "Secondary brand color",
                    },
                  },
                },
              },
            },
          },
        },
        PlanUpdate: {
          type: "object",
          properties: {
            brandId: {
              type: "string",
              description: "ID of the associated brand",
            },
            title: {
              type: "string",
              description: "Title of the plan",
            },
            dateRange: {
              type: "object",
              description: "Date range for the plan",
              properties: {
                start: {
                  type: "string",
                  format: "date-time",
                  description: "Start date",
                },
                end: {
                  type: "string",
                  format: "date-time",
                  description: "End date",
                },
              },
            },
            goals: {
              type: "array",
              items: {
                type: "string",
                description: "Plan goal",
              },
              description: "List of plan goals",
            },
            targetAudience: {
              type: "string",
              description: "Target audience description",
            },
            channels: {
              type: "array",
              items: {
                type: "string",
                description: "Channel",
              },
              description: "List of channels to be used",
            },
            userId: {
              type: "string",
              description: "ID of the user updating the plan",
            },
          },
        },
        ContentUpdate: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Title of the content",
            },
            content: {
              type: "string",
              description: "Content body",
            },
            scheduledFor: {
              type: "string",
              format: "date-time",
              description: "Scheduled publication date",
            },
            userId: {
              type: "string",
              description: "ID of the user updating the content",
            },
          },
        },
      },
    },
  },
  apis: ["./src/api/routes/*.ts"], // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
