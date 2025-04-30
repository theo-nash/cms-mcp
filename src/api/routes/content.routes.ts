import { Router, Request, Response, NextFunction } from "express";
import { body, param, query } from "express-validator";
import { ContentService } from "../../services/content.service.js";
import { validateRequest } from "../middleware/validate.js";
import { ContentState, Content, ContentCreationSchemaParser, ContentUpdateSchema } from "../../models/content.model.js";
import { sanitizeBody } from "../middleware/transform.js";
import { transformDates } from "../middleware/transform.js";

const router = Router();
const contentService = new ContentService();

/**
 * @swagger
 * /api/v1/content:
 *   get:
 *     summary: List all content with optional filters
 *     tags: [Content]
 *     parameters:
 *       - in: query
 *         name: microPlanId
 *         schema:
 *           type: string
 *         description: Filter content by micro plan ID
 *       - in: query
 *         name: brandId
 *         schema:
 *           type: string
 *         description: Filter content by brand ID
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *           enum: [draft, ready, published]
 *         description: Filter content by state
 *       - in: query
 *         name: masterPlanId
 *         schema:
 *           type: string
 *         description: Filter content by master plan ID
 *       - in: query
 *         name: campaignId
 *         schema:
 *           type: string
 *         description: Filter content by campaign ID
 *     responses:
 *       200:
 *         description: List of content
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Content'
 *       500:
 *         description: Internal server error
 */
router.get(
  "/",
  [
    query("microPlanId").optional().isString(),
    query("brandId").optional().isString(),
    query("state").optional().isIn(Object.values(ContentState)),
    query("masterPlanId").optional().isString(),
    query("campaignId").optional().isString(),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { microPlanId, brandId, state, masterPlanId, campaignId } = req.query;
      let content: Content[];

      // Push filtering to the repository/database level when possible
      if (campaignId) {
        content = await contentService.getContentByCampaignId(campaignId as string);
      } else if (masterPlanId) {
        content = await contentService.getContentByMasterPlanId(masterPlanId as string);
      } else if (microPlanId) {
        content = await contentService.getContentByMicroPlanId(microPlanId as string);
      } else if (brandId) {
        content = await contentService.getContentByBrandId(brandId as string);
      } else {
        // For state filtering, we should ideally add a repository method
        // that filters at the database level, but for now we'll keep the app-level filter
        content = await contentService.getAllContent();
      }

      if (state) {
        content = content.filter((item: Content) => item.state === state);
      }

      res.json(content);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/content/scheduled:
 *   get:
 *     summary: Get all scheduled content
 *     tags: [Content]
 *     parameters:
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *           enum: [draft, ready, published]
 *         description: Filter by content state (optional)
 *     responses:
 *       200:
 *         description: List of scheduled content
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Content'
 */
router.get(
  "/scheduled",
  [
    query("state").optional().isIn(Object.values(ContentState)),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { state } = req.query;

      // Convert single state to array if provided
      let states: ContentState[] | undefined;
      if (state) {
        states = [state as ContentState];
      }

      const scheduledContent = await contentService.getScheduledContent(states);
      res.json(scheduledContent);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/content/{id}:
 *   get:
 *     summary: Get content by ID
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Content ID
 *     responses:
 *       200:
 *         description: Content details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Content'
 *       404:
 *         description: Content not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:id",
  param("id").isString(),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const content = await contentService.getContent(req.params.id);
      if (!content) {
        res.status(404).json({ message: "Content not found" });
        return;
      }
      res.json(content);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/content:
 *   post:
 *     summary: Create new content
 *     tags: [Content]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - userId
 *             properties:
 *               microPlanId:
 *                 type: string
 *                 description: ID of the associated micro plan (required if brandId not provided)
 *               brandId:
 *                 type: string
 *                 description: ID of the associated brand (required if microPlanId not provided)
 *               title:
 *                 type: string
 *                 description: Title of the content
 *               content:
 *                 type: string
 *                 description: Content body
 *               scheduledFor:
 *                 type: string
 *                 format: date-time
 *                 description: Scheduled publication date
 *               userId:
 *                 type: string
 *                 description: ID of the user creating the content
 *               format:
 *                 type: string
 *                 description: Content format
 *               platform:
 *                 type: string
 *                 description: Platform for the content
 *               mediaRequirements:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                   description:
 *                     type: string
 *               targetAudience:
 *                 type: string
 *                 description: Target audience for the content
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Keywords for the content
 *               comments:
 *                 type: string
 *                 description: Comments about the content
 *     responses:
 *       201:
 *         description: Content created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Content'
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */
router.post(
  "/",
  [
    transformDates(["scheduledFor"]),
    sanitizeBody([
      "microPlanId", "brandId", "title", "content",
      "scheduledFor", "userId", "comments",
      "format", "platform", "mediaRequirements",
      "targetAudience", "keywords",
      "mediaRequirements.type", "mediaRequirements.description"
    ]),
    body("microPlanId").optional().isString(),
    body("brandId").optional().isString(),
    body("title").isString().notEmpty(),
    body("content").isString().notEmpty(),
    body("scheduledFor").optional().isISO8601(),
    body("userId").optional().isString(),
    body("format").optional().isString(),
    body("platform").optional().isString(),
    body("mediaRequirements").optional().isObject(),
    body("mediaRequirements.type").optional().isString(),
    body("mediaRequirements.description").optional().isString(),
    body("targetAudience").optional().isString(),
    body("keywords").optional().isArray(),
    body("keywords.*").optional().isString(),
    body("comments").optional().isString(),
    // Validate that either microPlanId or brandId is provided
    body().custom(value => {
      if (!value.microPlanId && !value.brandId) {
        throw new Error('Either microPlanId or brandId must be provided');
      }
      return true;
    })
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Create properly typed content creation data
      const contentData = ContentCreationSchemaParser.parse(req.body);

      const content = await contentService.createContent(contentData);
      res.status(201).json(content);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/content/{id}:
 *   put:
 *     summary: Update content
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Content ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the content
 *               content:
 *                 type: string
 *                 description: Content body
 *               scheduledFor:
 *                 type: string
 *                 format: date-time
 *                 description: Scheduled publication date
 *               userId:
 *                 type: string
 *                 description: ID of the user updating the content
 *     responses:
 *       200:
 *         description: Content updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Content'
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Content not found
 *       500:
 *         description: Internal server error
 */
router.put(
  "/:id",
  [
    param("id").isString(),
    transformDates(["scheduledFor"]),
    sanitizeBody([
      "title", "content", "scheduledFor", "userId"
    ]),
    body("title").optional().isString(),
    body("content").optional().isString(),
    body("scheduledFor").optional().isISO8601(),
    body("userId").isString().notEmpty(),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Create a sanitized update object
      const updates = ContentUpdateSchema.parse(req.body);

      const content = await contentService.updateContent(updates);

      res.json(content);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/content/{id}/state:
 *   post:
 *     summary: Transition content state
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Content ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetState
 *               - userId
 *             properties:
 *               targetState:
 *                 type: string
 *                 enum: [draft, ready, published]
 *                 description: Target state to transition to
 *               userId:
 *                 type: string
 *                 description: ID of the user transitioning the state
 *               comments:
 *                 type: string
 *                 description: Optional comments about the transition
 *     responses:
 *       200:
 *         description: Content state transitioned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Content'
 *       400:
 *         description: Invalid input data or invalid state transition
 *       404:
 *         description: Content not found
 *       500:
 *         description: Internal server error
 */
router.post(
  "/:id/state",
  [
    param("id").isString(),
    sanitizeBody(["targetState", "userId", "comments"]),
    body("targetState").isIn(Object.values(ContentState)),
    body("userId").isString().notEmpty(),
    body("comments").optional().isString(),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get current content to validate transition
      const currentContent = await contentService.getContent(req.params.id);
      if (!currentContent) {
        res.status(404).json({ message: "Content not found" });
        return;
      }

      // Validate state transition before calling service
      const currentState = currentContent.state;
      const targetState = req.body.targetState as ContentState;

      // Define valid transitions (this should ideally be moved to a shared location)
      const validTransitions: Record<ContentState, ContentState[]> = {
        [ContentState.Draft]: [ContentState.Ready],
        [ContentState.Ready]: [ContentState.Draft, ContentState.Published],
        [ContentState.Published]: [] // Terminal state
      };

      // Check if transition is valid
      if (!validTransitions[currentState].includes(targetState)) {
        res.status(400).json({
          message: `Invalid state transition from ${currentState} to ${targetState}`,
          validTransitions: validTransitions[currentState]
        });
        return;
      }

      // Proceed with the transition if valid
      const content = await contentService.transitionContentState(
        req.params.id,
        targetState,
        {
          userId: req.body.userId,
          comments: req.body.comments,
        }
      );

      res.json(content);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/content/{id}/schedule:
 *   post:
 *     summary: Schedule content for publication
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Content ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - publishAt
 *               - userId
 *             properties:
 *               publishAt:
 *                 type: string
 *                 format: date-time
 *                 description: Scheduled publication date and time
 *               userId:
 *                 type: string
 *                 description: ID of the user scheduling the content
 *     responses:
 *       200:
 *         description: Content scheduled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Content'
 *       400:
 *         description: Invalid input data or content not in Ready state
 *       404:
 *         description: Content not found
 *       500:
 *         description: Internal server error
 */
router.post(
  "/:id/schedule",
  [
    param("id").isString(),
    transformDates(["publishAt"]),
    sanitizeBody(["publishAt", "userId"]),
    body("publishAt").isISO8601(),
    body("userId").isString().notEmpty(),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const content = await contentService.scheduleContent(
        req.params.id,
        new Date(req.body.publishAt),
        req.body.userId
      );
      if (!content) {
        res.status(404).json({ message: "Content not found" });
        return;
      }
      res.json(content);
    } catch (error) {
      next(error);
    }
  }
);


/**
 * @swagger
 * /api/v1/content/master-plan/{masterPlanId}:
 *   get:
 *     summary: Get content by master plan ID
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: masterPlanId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of content for the master plan
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Content'
 */
router.get(
  "/master-plan/:masterPlanId",
  param("masterPlanId").isString(),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const content = await contentService.getContentByMasterPlanId(req.params.masterPlanId);
      res.json(content);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/content/campaign/{campaignId}:
 *   get:
 *     summary: Get content by campaign ID
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of content for the campaign
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Content'
 */
router.get(
  "/campaign/:campaignId",
  param("campaignId").isString(),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const content = await contentService.getContentByCampaignId(req.params.campaignId);
      res.json(content);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/content/brand/{brandId}:
 *   get:
 *     summary: Get content by brand ID
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: brandId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of content for the brand
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Content'
 */
router.get(
  "/brand/:brandId",
  param("brandId").isString(),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const content = await contentService.getContentByBrandId(req.params.brandId);
      res.json(content);
    } catch (error) {
      next(error);
    }
  }
);

export const contentRoutes = router;
