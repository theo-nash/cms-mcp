import { Router, RequestHandler } from "express";
import { body, param } from "express-validator";
import { CampaignService } from "../../services/campaign.service.js";
import { validateRequest } from "../middleware/validate.js";

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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               objectives:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Campaign created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Campaign'
 */
const createCampaignHandler: RequestHandler = async (req, res, next) => {
  try {
    const campaign = await campaignService.createCampaign(req.body);
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
 *             $ref: '#/components/schemas/CampaignUpdate'
 *     responses:
 *       200:
 *         description: Campaign updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Campaign'
 *       404:
 *         description: Campaign not found
 */
const updateCampaignHandler: RequestHandler = async (req, res, next) => {
  try {
    const campaign = await campaignService.updateCampaign(
      req.params.id,
      req.body
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
    body("name").isString().notEmpty(),
    body("description").isString().notEmpty(),
    body("startDate").isISO8601(),
    body("endDate").isISO8601(),
    body("objectives").optional().isArray(),
  ],
  validateRequest,
  createCampaignHandler
);
router.put(
  "/:id",
  [
    param("id").isString(),
    body("name").optional().isString(),
    body("description").optional().isString(),
    body("startDate").optional().isISO8601(),
    body("endDate").optional().isISO8601(),
    body("objectives").optional().isArray(),
    body("status")
      .optional()
      .isIn(["draft", "active", "completed", "archived"]),
  ],
  validateRequest,
  updateCampaignHandler
);

export const campaignRoutes = router;
