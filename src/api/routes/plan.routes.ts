import { Router, RequestHandler } from "express";
import { body, param, query } from "express-validator";
import { MasterPlanCreationData, MicroPlanCreationData, PlanService } from "../../services/plan.service.js";
import { validateRequest } from "../middleware/validate.js";
import { PlanType, PlanState, Plan, MasterPlan, MicroPlan } from "../../models/plan.model.js";
import { PlanRepository } from "../../repositories/plan.repository.js";
import { transformDates } from "../middleware/transform.js";
import { transformCasing } from "../middleware/transform.js";
import { sanitizeBody } from "../middleware/transform.js";

const router = Router();
const planService = new PlanService();
const planRepository = new PlanRepository();

/**
 * @swagger
 * /api/v1/plans:
 *   get:
 *     summary: List all plans with optional filters
 *     tags: [Plans]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         schema:
 *           type: string
 *         description: Filter plans by brand ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [master, micro]
 *         description: Filter plans by type
 *       - in: query
 *         name: campaignId
 *         schema:
 *           type: string
 *         description: Filter plans by campaign ID
 *       - in: query
 *         name: masterPlanId
 *         schema:
 *           type: string
 *         description: Filter plans by master plan ID
 *     responses:
 *       200:
 *         description: List of plans
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Plan'
 *       500:
 *         description: Internal server error
 */
const getAllPlansHandler: RequestHandler = async (req, res, next) => {
  try {
    const { brandId, type, campaignId, masterPlanId } = req.query;
    let plans: Plan[];

    if (campaignId) {
      plans = await planService.getAllPlansByCampaignId(campaignId as string);
    } else if (masterPlanId) {
      plans = await planService.getMicroPlansByMasterId(masterPlanId as string);
    } else if (brandId) {
      plans = await planService.getPlansByBrandId(brandId as string);
    } else {
      plans = await planService.getAllPlans();
    }

    if (type) {
      plans = plans.filter((plan: Plan) => plan.type === type);
    }

    void res.json(plans);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/plans/{id}:
 *   get:
 *     summary: Get a plan by ID
 *     tags: [Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Plan ID
 *     responses:
 *       200:
 *         description: Plan details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Plan'
 *       404:
 *         description: Plan not found
 *       500:
 *         description: Internal server error
 */
const getPlanByIdHandler: RequestHandler = async (req, res, next) => {
  try {
    const plan = await planService.getPlan(req.params.id);
    if (!plan) {
      void res.status(404).json({ message: "Plan not found" });
      return;
    }
    void res.json(plan);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/plans:
 *   post:
 *     summary: Create a new plan
 *     tags: [Plans]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - brandId
 *               - title
 *               - type
 *               - dateRange
 *               - goals
 *               - targetAudience
 *               - channels
 *               - userId
 *             properties:
 *               brandId:
 *                 type: string
 *                 description: ID of the associated brand
 *               title:
 *                 type: string
 *                 description: Title of the plan
 *               type:
 *                 type: string
 *                 enum: [master, micro]
 *                 description: Type of the plan
 *               parentPlanId:
 *                 type: string
 *                 description: ID of the parent plan (for micro plans)
 *               campaignId:
 *                 type: string
 *                 description: ID of the associated campaign
 *               dateRange:
 *                 type: object
 *                 description: Date range for the plan
 *                 properties:
 *                   start:
 *                     type: string
 *                     format: date-time
 *                     description: Start date
 *                   end:
 *                     type: string
 *                     format: date-time
 *                     description: End date
 *               goals:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of plan goals
 *               targetAudience:
 *                 type: string
 *                 description: Target audience description
 *               channels:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of channels to be used
 *               userId:
 *                 type: string
 *                 description: ID of the user creating the plan
 *     responses:
 *       201:
 *         description: Plan created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Plan'
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */
const createPlanHandler: RequestHandler = async (req, res, next) => {
  try {
    const { type } = req.body;

    if (type === PlanType.Master) {
      // Create properly typed master plan data
      const masterPlanData: MasterPlanCreationData = {
        campaignId: req.body.campaignId,
        title: req.body.title,
        dateRange: {
          start: new Date(req.body.dateRange.start),
          end: new Date(req.body.dateRange.end)
        },
        goals: req.body.goals || [],
        targetAudience: req.body.targetAudience,
        channels: req.body.channels || [],
        userId: req.body.userId || "default-user-id"
      };

      const plan = await planService.createMasterPlan(masterPlanData);
      void res.status(201).json(plan);
    } else if (type === PlanType.Micro) {
      // Create properly typed micro plan data
      const microPlanData: MicroPlanCreationData = {
        masterPlanId: req.body.masterPlanId, // Fix: Use masterPlanId instead of parentPlanId
        title: req.body.title,
        dateRange: {
          start: new Date(req.body.dateRange.start),
          end: new Date(req.body.dateRange.end)
        },
        goals: req.body.goals || [],
        targetAudience: req.body.targetAudience,
        channels: req.body.channels || [],
        userId: req.body.userId || "default-user-id"
      };

      const plan = await planService.createMicroPlan(microPlanData);
      void res.status(201).json(plan);
    } else {
      // Invalid plan type
      void res.status(400).json({ message: "Invalid plan type" });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/plans/{id}:
 *   put:
 *     summary: Update a plan
 *     tags: [Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Plan ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               brandId:
 *                 type: string
 *                 description: ID of the associated brand
 *               title:
 *                 type: string
 *                 description: Title of the plan
 *               dateRange:
 *                 type: object
 *                 description: Date range for the plan
 *                 properties:
 *                   start:
 *                     type: string
 *                     format: date-time
 *                     description: Start date
 *                   end:
 *                     type: string
 *                     format: date-time
 *                     description: End date
 *               goals:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of plan goals
 *               targetAudience:
 *                 type: string
 *                 description: Target audience description
 *               channels:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of channels to be used
 *               userId:
 *                 type: string
 *                 description: ID of the user updating the plan
 *     responses:
 *       200:
 *         description: Plan updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Plan'
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Plan not found
 *       500:
 *         description: Internal server error
 */
const updatePlanHandler: RequestHandler = async (req, res, next) => {
  try {
    // Create a sanitized update object
    const updates: Partial<Omit<Plan, "_id">> = {};

    if (req.body.title !== undefined) updates.title = req.body.title;

    if (req.body.dateRange) {
      updates.dateRange = {
        start: new Date(req.body.dateRange.start),
        end: new Date(req.body.dateRange.end)
      };
    }

    if (req.body.goals !== undefined) updates.goals = req.body.goals;
    if (req.body.targetAudience !== undefined) updates.targetAudience = req.body.targetAudience;
    if (req.body.channels !== undefined) updates.channels = req.body.channels;

    const plan = await planService.updatePlan(
      req.params.id,
      updates,
      req.body.userId || "default-user-id"
    );

    if (!plan) {
      void res.status(404).json({ message: "Plan not found" });
      return;
    }
    void res.json(plan);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/plans/{id}/state:
 *   put:
 *     summary: Update plan state
 *     tags: [Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Plan ID
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
 *                 enum: [draft, review, approved, active]
 *                 description: New state of the plan
 *               userId:
 *                 type: string
 *                 description: ID of the user updating the state
 *     responses:
 *       200:
 *         description: Plan state updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Plan'
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Plan not found
 *       500:
 *         description: Internal server error
 */
const updatePlanStateHandler: RequestHandler = async (req, res, next) => {
  try {
    const { state, userId } = req.body;
    const plan = await planService.transitionPlanState(
      req.params.id,
      state as PlanState,
      userId || "default-user-id"
    );
    if (!plan) {
      void res.status(404).json({ message: "Plan not found" });
      return;
    }
    void res.json(plan);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/plans/master/{masterPlanId}/micro:
 *   get:
 *     summary: Get all micro plans for a master plan
 *     tags: [Plans]
 *     parameters:
 *       - in: path
 *         name: masterPlanId
 *         required: true
 *         schema:
 *           type: string
 *         description: Master plan ID
 *     responses:
 *       200:
 *         description: List of micro plans
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Plan'
 *       404:
 *         description: Master plan not found
 *       500:
 *         description: Internal server error
 */
const getMicroPlansByMasterIdHandler: RequestHandler = async (req, res, next) => {
  try {
    const microPlans = await planService.getMicroPlansByMasterId(
      req.params.masterPlanId
    );
    void res.json(microPlans);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/plans/campaign/{campaignId}/master:
 *   get:
 *     summary: Get all master plans for a campaign
 *     tags: [Plans]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     responses:
 *       200:
 *         description: List of master plans
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Plan'
 *       404:
 *         description: Campaign not found
 *       500:
 *         description: Internal server error
 */
const getMasterPlansByCampaignIdHandler: RequestHandler = async (req, res, next) => {
  try {
    const masterPlans = await planService.getMasterPlansByCampaignId(
      req.params.campaignId
    );
    void res.json(masterPlans);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/plans/campaign/{campaignId}:
 *   get:
 *     summary: Get all plans for a campaign
 *     tags: [Plans]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     responses:
 *       200:
 *         description: List of plans
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Plan'
 *       404:
 *         description: Campaign not found
 *       500:
 *         description: Internal server error
 */
const getAllPlansByCampaignIdHandler: RequestHandler = async (req, res, next) => {
  try {
    const plans = await planService.getAllPlansByCampaignId(
      req.params.campaignId
    );
    void res.json(plans);
  } catch (error) {
    next(error);
  }
};

router.get("/", [
  query("brandId").optional().isString(),
  query("type").optional().isIn(Object.values(PlanType)),
  query("campaignId").optional().isString(),
  query("masterPlanId").optional().isString(),
], validateRequest, getAllPlansHandler);

router.get("/:id", [
  param("id").isString(),
], validateRequest, getPlanByIdHandler);

router.post("/", [
  // Transform nested date fields
  transformDates(["dateRange.start", "dateRange.end"]),
  // Transform field names to match service interfaces
  transformCasing({
    "parent_plan_id": "masterPlanId",
    "date_range": "dateRange",
    "target_audience": "targetAudience"
  }),
  // Sanitize body to only include expected fields
  sanitizeBody([
    "title", "type", "campaignId", "masterPlanId", "dateRange",
    "dateRange.start", "dateRange.end", "goals", "targetAudience",
    "channels", "userId"
  ]),
  body("title").isString(),
  body("type").isIn(Object.values(PlanType)),
  body("parentPlanId").optional().isString(),
  body("campaignId").optional().isString(),
  body("dateRange").isObject(),
  body("dateRange.start").isISO8601(),
  body("dateRange.end").isISO8601(),
  body("goals").isArray(),
  body("targetAudience").isString(),
  body("channels").isArray(),
  body("userId").optional().isString(),
  // Conditionally require campaignId for master plans
  body("campaignId").custom((value, { req }) => {
    if (req.body.type === PlanType.Master && !value) {
      throw new Error("campaignId is required for master plans");
    }
    return true;
  }),
  // Conditionally require masterPlanId for micro plans
  body("masterPlanId").custom((value, { req }) => {
    if (req.body.type === PlanType.Micro && !value) {
      throw new Error("masterPlanId is required for micro plans");
    }
    return true;
  }),
], validateRequest, createPlanHandler);

router.put("/:id", [
  transformDates(["dateRange.start", "dateRange.end"]),
  transformCasing({
    "date_range": "dateRange",
    "target_audience": "targetAudience"
  }),
  sanitizeBody([
    "title", "dateRange", "dateRange.start", "dateRange.end",
    "goals", "targetAudience", "channels", "userId"
  ]),
  param("id").isString(),
  body("title").optional().isString(),
  body("dateRange").optional().isObject(),
  body("goals").optional().isArray(),
  body("targetAudience").optional().isString(),
  body("channels").optional().isArray(),
  body("userId").optional().isString(),
], validateRequest, updatePlanHandler);

router.put("/:id/state", [
  param("id").isString(),
  transformDates(["dateRange.start", "dateRange.end"]),
  transformCasing({
    "date_range": "dateRange",
    "target_audience": "targetAudience"
  }),
  sanitizeBody([
    "title", "dateRange", "dateRange.start", "dateRange.end",
    "goals", "targetAudience", "channels", "userId"
  ]),
  body("state").isIn(Object.values(PlanState)),
  body("userId").optional().isString(),
  body("comments").optional().isString(),
], validateRequest, updatePlanStateHandler);

router.get("/master/:masterPlanId/micro", [
  param("masterPlanId").isString(),
], validateRequest, getMicroPlansByMasterIdHandler);

router.get("/campaign/:campaignId/master", [
  param("campaignId").isString(),
], validateRequest, getMasterPlansByCampaignIdHandler);

router.get("/campaign/:campaignId/all", [
  param("campaignId").isString(),
], validateRequest, getAllPlansByCampaignIdHandler);

export const planRoutes = router;
