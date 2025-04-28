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
              description: "Campaign ID",
            },
            name: {
              type: "string",
              description: "Campaign name",
            },
            description: {
              type: "string",
              description: "Campaign description",
            },
            startDate: {
              type: "string",
              format: "date-time",
              description: "Campaign start date",
            },
            endDate: {
              type: "string",
              format: "date-time",
              description: "Campaign end date",
            },
            objectives: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Campaign objectives",
            },
            status: {
              type: "string",
              enum: ["draft", "active", "completed", "archived"],
              description: "Campaign status",
            },
          },
        },
        Plan: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Plan ID",
            },
            brandId: {
              type: "string",
              description: "Brand ID",
            },
            title: {
              type: "string",
              description: "Plan title",
            },
            type: {
              type: "string",
              enum: ["master", "micro"],
              description: "Plan type",
            },
            parentPlanId: {
              type: "string",
              description: "Parent plan ID (for micro plans)",
            },
            campaignId: {
              type: "string",
              description: "Campaign ID",
            },
            dateRange: {
              type: "object",
              properties: {
                start: {
                  type: "string",
                  format: "date-time",
                },
                end: {
                  type: "string",
                  format: "date-time",
                },
              },
            },
            goals: {
              type: "array",
              items: {
                type: "string",
              },
            },
            targetAudience: {
              type: "string",
            },
            channels: {
              type: "array",
              items: {
                type: "string",
              },
            },
            state: {
              type: "string",
              enum: ["draft", "review", "approved", "active"],
            },
            isActive: {
              type: "boolean",
            },
          },
        },
        Content: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Content ID",
            },
            planId: {
              type: "string",
              description: "Plan ID",
            },
            brandId: {
              type: "string",
              description: "Brand ID",
            },
            title: {
              type: "string",
              description: "Content title",
            },
            content: {
              type: "string",
              description: "Content body",
            },
            state: {
              type: "string",
              enum: ["draft", "ready", "published"],
              description: "Content state",
            },
            stateMetadata: {
              type: "object",
              properties: {
                scheduledFor: {
                  type: "string",
                  format: "date-time",
                },
                publishedAt: {
                  type: "string",
                  format: "date-time",
                },
                publishedUrl: {
                  type: "string",
                },
              },
            },
          },
        },
        Brand: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Brand ID",
            },
            name: {
              type: "string",
              description: "Brand name",
            },
            description: {
              type: "string",
              description: "Brand description",
            },
            guidelines: {
              type: "object",
              properties: {
                tone: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
                vocabulary: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
                avoidedTerms: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
                visualIdentity: {
                  type: "object",
                  properties: {
                    primaryColor: {
                      type: "string",
                    },
                    secondaryColor: {
                      type: "string",
                    },
                  },
                },
              },
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
