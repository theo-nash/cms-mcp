import { Router, RequestHandler } from "express";
import { body, param } from "express-validator";
import { CampaignCreationData, CampaignService } from "../../services/campaign.service.js";
import { validateRequest } from "../middleware/validate.js";
import { Campaign, CampaignStatus } from "../../models/campaign.model.js";
import { sanitizeBody, transformDates } from "../middleware/transform.js";

const router = Router();
const campaignService = new CampaignService();

/**
 * @swagger
 * /api/v1/campaigns:
 *   get:
 *     summary: List all campaigns
 *     tags: [Campaigns]
 *     responses:
 *       200:
 *         description: List of campaigns
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Campaign'
 */
const getAllCampaignsHandler: RequestHandler = async (req, res, next) => {
  try {
    const campaigns = await campaignService.getAllCampaigns();
    void res.json(campaigns);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/campaigns/{id}:
 *   get:
 *     summary: Get a campaign by ID
 *     tags: [Campaigns]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Campaign details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Campaign'
 *       404:
 *         description: Campaign not found
 */
const getCampaignByIdHandler: RequestHandler = async (req, res, next) => {
  try {
    const campaign = await campaignService.getCampaignById(req.params.id);
    if (!campaign) {
      void res.status(404).json({ message: "Campaign not found" });
      return;
    }
    void res.json(campaign);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/campaigns:
 *   post:
 *     summary: Create a new campaign
 *     tags: [Campaigns]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - startDate
 *               - endDate
 *               - brandId
 *               - userId
 *             properties:
 *               name:
 *                 type: string
 *                 description: Campaign name
 *               description:
 *                 type: string
 *                 description: Campaign description
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: Campaign start date
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Campaign end date
 *               objectives:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Campaign objectives
 *               brandId:
 *                 type: string
 *                 description: ID of the associated brand
 *               userId:
 *                 type: string
 *                 description: User ID creating the campaign
 *     responses:
 *       201:
 *         description: Campaign created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Campaign'
 *       400:
 *         description: Invalid input data
 */
const createCampaignHandler: RequestHandler = async (req, res, next) => {
  try {
    // Create a properly typed campaign data object
    const campaignData: CampaignCreationData = {
      brandId: req.body.brandId,
      name: req.body.name,
      // Make description optional to align with model schema
      description: req.body.description || undefined,
      // Convert ISO date strings to Date objects
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      objectives: req.body.objectives || [],
      userId: req.body.userId || "default-user-id"
    };

    const campaign = await campaignService.createCampaign(campaignData);
    void res.status(201).json(campaign);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/campaigns/{id}:
 *   put:
 *     summary: Update a campaign
 *     tags: [Campaigns]
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
 *             properties:
 *               name:
 *                 type: string
 *                 description: Campaign name
 *               description:
 *                 type: string
 *                 description: Campaign description
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: Campaign start date
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Campaign end date
 *               objectives:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Campaign objectives
 *               status:
 *                 type: string
 *                 enum: [draft, active, completed, archived]
 *                 description: Campaign status
 *               userId:
 *                 type: string
 *                 description: User ID updating the campaign
 *     responses:
 *       200:
 *         description: Campaign updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Campaign'
 *       404:
 *         description: Campaign not found
 *       400:
 *         description: Invalid input data
 */
const updateCampaignHandler: RequestHandler = async (req, res, next) => {
  try {
    // Create a sanitized update object with proper types
    const updates: Partial<Omit<Campaign, "_id">> = {};

    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.startDate !== undefined) updates.startDate = new Date(req.body.startDate);
    if (req.body.endDate !== undefined) updates.endDate = new Date(req.body.endDate);
    if (req.body.objectives !== undefined) updates.objectives = req.body.objectives;

    // Use enum for status instead of string literals
    if (req.body.status !== undefined) {
      updates.status = req.body.status as CampaignStatus;
    }

    const campaign = await campaignService.updateCampaign(
      req.params.id,
      updates,
      req.body.userId || "default-user-id"
    );

    if (!campaign) {
      void res.status(404).json({ message: "Campaign not found" });
      return;
    }
    void res.json(campaign);
  } catch (error) {
    next(error);
  }
};


router.get("/", getAllCampaignsHandler);
router.get("/:id", param("id").isString(), validateRequest, getCampaignByIdHandler);
router.post(
  "/",
  [
    // Transform dates before validation
    transformDates(["startDate", "endDate"]),
    // Sanitize to include only expected fields
    sanitizeBody([
      "name", "description", "startDate", "endDate",
      "objectives", "brandId", "userId"
    ]),
    body("name").isString().notEmpty(),
    body("description").isString().notEmpty(),
    body("startDate").isISO8601(),
    body("endDate").isISO8601(),
    body("objectives").optional().isArray(),
    body("brandId").isString().notEmpty(),
    body("userId").isString().notEmpty()
  ],
  validateRequest,
  createCampaignHandler
);
router.put(
  "/:id",
  [
    transformDates(["startDate", "endDate"]),
    param("id").isString(),
    body("name").optional().isString(),
    body("description").optional().isString(),
    body("startDate").optional().isISO8601(),
    body("endDate").optional().isISO8601(),
    body("objectives").optional().isArray(),
    body("status")
      .optional()
      .isIn(["draft", "active", "completed", "archived"]),
    body("userId").isString().notEmpty(),
  ],
  validateRequest,
  updateCampaignHandler
);

export const campaignRoutes = router;
