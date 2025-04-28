import { Router, Request, Response, NextFunction } from "express";
import { body, param } from "express-validator";
import { ContentService } from "../../services/content.service.js";
import { validateRequest } from "../middleware/validate.js";
import { ContentState } from "../../models/content.model.js";

const router = Router();
const contentService = new ContentService();

/**
 * @swagger
 * /api/v1/content:
 *   get:
 *     summary: List all content
 *     tags: [Content]
 *     parameters:
 *       - in: query
 *         name: planId
 *         schema:
 *           type: string
 *         description: Filter content by plan ID
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
 *     responses:
 *       200:
 *         description: List of content
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Content'
 */
router.get("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { planId, brandId, state } = req.query;
    let content;

    if (planId) {
      content = await contentService.getContentByPlanId(planId as string);
    } else if (brandId) {
      content = await contentService.getContentByBrandId(brandId as string);
    } else {
      content = await contentService.getAllContent();
    }

    if (state) {
      content = content.filter((item) => item.state === state);
    }

    res.json(content);
  } catch (error) {
    next(error);
  }
});

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
 *     responses:
 *       200:
 *         description: Content details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Content'
 *       404:
 *         description: Content not found
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
 *               - planId
 *               - brandId
 *               - title
 *               - content
 *               - userId
 *             properties:
 *               planId:
 *                 type: string
 *               brandId:
 *                 type: string
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               scheduledFor:
 *                 type: string
 *                 format: date-time
 *               userId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Content created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Content'
 */
router.post(
  "/",
  [
    body("planId").isString().notEmpty(),
    body("brandId").isString().notEmpty(),
    body("title").isString().notEmpty(),
    body("content").isString().notEmpty(),
    body("scheduledFor").optional().isISO8601(),
    body("userId").isString().notEmpty(),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const content = await contentService.createContent(req.body);
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContentUpdate'
 *     responses:
 *       200:
 *         description: Content updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Content'
 *       404:
 *         description: Content not found
 */
router.put(
  "/:id",
  [
    param("id").isString(),
    body("title").optional().isString(),
    body("content").optional().isString(),
    body("scheduledFor").optional().isISO8601(),
    body("userId").isString().notEmpty(),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const content = await contentService.updateContent(
        req.params.id,
        req.body,
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
 * /api/v1/content/{id}/state:
 *   put:
 *     summary: Update content state
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - state
 *               - userId
 *             properties:
 *               state:
 *                 type: string
 *                 enum: [draft, ready, published]
 *               userId:
 *                 type: string
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Content state updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Content'
 *       404:
 *         description: Content not found
 */
router.put(
  "/:id/state",
  [
    param("id").isString(),
    body("state").isIn(Object.values(ContentState)),
    body("userId").isString().notEmpty(),
    body("comments").optional().isString(),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const content = await contentService.transitionContentState(
        req.params.id,
        req.body.state,
        {
          userId: req.body.userId,
          comments: req.body.comments,
        }
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

export const contentRoutes = router;
