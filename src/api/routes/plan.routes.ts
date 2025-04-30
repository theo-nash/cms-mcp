import { Router, RequestHandler } from "express";
import { body, param, query } from "express-validator";
import { PlanService } from "../../services/plan.service.js";
import { validateRequest } from "../middleware/validate.js";
import { PlanType, PlanState, Plan, MasterPlan, MicroPlan, MasterPlanCreationSchemaParser, MicroPlanCreationSchemaParser, MasterPlanCreationParams, MicroPlanCreationParams, MicroPlanUpdateParams, MasterPlanUpdateParams, MasterPlanUpdateSchemaParser, MicroPlanUpdateSchemaParser } from "../../models/plan.model.js";
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
 *               - title
 *               - type
 *               - dateRange
 *               - goals
 *               - targetAudience
 *               - channels
 *               - userId
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the plan
 *               type:
 *                 type: string
 *                 enum: [master, micro]
 *                 description: Type of the plan
 *               campaignId:
 *                 type: string
 *                 description: ID of the associated campaign (required for master plans)
 *               masterPlanId:
 *                 type: string
 *                 description: ID of the parent master plan (required for micro plans)
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
 *               planGoals:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     campaignGoalId:
 *                       type: string
 *                     description:
 *                       type: string
 *                     metrics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           target:
 *                             type: number
 *               contentStrategy:
 *                 type: object
 *                 properties:
 *                   approach:
 *                     type: string
 *                   keyThemes:
 *                     type: array
 *                     items:
 *                       type: string
 *                   distribution:
 *                     type: object
 *                     additionalProperties:
 *                       type: number
 *               timeline:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date-time
 *                     description:
 *                       type: string
 *                     type:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [pending, in-progress, completed]
 *               contentSeries:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   expectedPieces:
 *                     type: number
 *                   theme:
 *                     type: string
 *               performanceMetrics:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     metricName:
 *                       type: string
 *                     target:
 *                       type: number
 *                     actual:
 *                       type: number
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
      const masterPlanData = MasterPlanCreationSchemaParser.parse(req.body);

      const plan = await planService.createMasterPlan(masterPlanData);
      void res.status(201).json(plan);
    } else if (type === PlanType.Micro) {
      // Create properly typed micro plan data
      const microPlanData = MicroPlanCreationSchemaParser.parse(req.body);

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
 *               state:
 *                 type: string
 *                 enum: [draft, review, approved, active]
 *                 description: Plan state
 *               isActive:
 *                 type: boolean
 *                 description: Whether the plan is active
 *               userId:
 *                 type: string
 *                 description: ID of the user updating the plan
 *               comments:
 *                 type: string
 *                 description: Comments about the update
 *               planGoals:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     campaignGoalId:
 *                       type: string
 *                     description:
 *                       type: string
 *                     metrics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           target:
 *                             type: number
 *               contentStrategy:
 *                 type: object
 *                 properties:
 *                   approach:
 *                     type: string
 *                   keyThemes:
 *                     type: array
 *                     items:
 *                       type: string
 *                   distribution:
 *                     type: object
 *                     additionalProperties:
 *                       type: number
 *               timeline:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date-time
 *                     description:
 *                       type: string
 *                     type:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [pending, in-progress, completed]
 *               contentSeries:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   expectedPieces:
 *                     type: number
 *                   theme:
 *                     type: string
 *               performanceMetrics:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     metricName:
 *                       type: string
 *                     target:
 *                       type: number
 *                     actual:
 *                       type: number
 *     responses:
 *       200:
 *         description: Plan updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Plan'
 *       404:
 *         description: Plan not found
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */
const updatePlanHandler: RequestHandler = async (req, res, next) => {
  try {
    // Get the existing plan to determine its type
    const existingPlan = await planService.getPlan(req.params.id);
    if (!existingPlan) {
      void res.status(404).json({ message: "Plan not found" });
      return;
    }

    // Create update object with common fields
    let updates: MicroPlanUpdateParams | MasterPlanUpdateParams | null = null;

    // Type-specific fields
    if (existingPlan.type === PlanType.Master) {
      updates = MasterPlanUpdateSchemaParser.parse(req.body);
    } else if (existingPlan.type === PlanType.Micro) {
      updates = MicroPlanUpdateSchemaParser.parse(req.body);
    }

    if (!updates) {
      void res.status(400).json({ message: "Invalid update data" });
      return;
    }

    // Update the plan
    const updatedPlan = await planService.updatePlan(updates);

    if (!updatedPlan) {
      void res.status(404).json({ message: "Plan not found" });
      return;
    }

    void res.json(updatedPlan);
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
  transformDates([
    "dateRange.start", "dateRange.end",
    "timeline[].date"
  ]),
  sanitizeBody([
    "title", "type", "campaignId", "masterPlanId",
    "dateRange", "dateRange.start", "dateRange.end",
    "goals", "targetAudience", "channels", "userId",
    "planGoals", "planGoals[].campaignGoalId", "planGoals[].description",
    "planGoals[].metrics", "planGoals[].metrics[].name", "planGoals[].metrics[].target",
    "contentStrategy", "contentStrategy.approach", "contentStrategy.keyThemes", "contentStrategy.distribution",
    "timeline", "timeline[].date", "timeline[].description", "timeline[].type", "timeline[].status",
    "contentSeries", "contentSeries.name", "contentSeries.description", "contentSeries.expectedPieces", "contentSeries.theme",
    "performanceMetrics", "performanceMetrics[].metricName", "performanceMetrics[].target", "performanceMetrics[].actual"
  ]),
  body("title").isString().notEmpty(),
  body("type").isIn(Object.values(PlanType)),
  body("dateRange").isObject(),
  body("dateRange.start").isISO8601(),
  body("dateRange.end").isISO8601(),
  body("goals").isArray(),
  body("goals.*").isString(),
  body("targetAudience").isString(),
  body("channels").isArray(),
  body("channels.*").isString(),
  body("userId").isString(),
  // Conditional validation based on plan type
  body("campaignId").if(body("type").equals(PlanType.Master)).isString().notEmpty()
    .withMessage("campaignId is required for master plans"),
  body("masterPlanId").if(body("type").equals(PlanType.Micro)).isString().notEmpty()
    .withMessage("masterPlanId is required for micro plans"),
  // Optional fields for master plans
  body("planGoals").optional().isArray(),
  body("planGoals.*.campaignGoalId").optional().isString(),
  body("planGoals.*.description").optional().isString(),
  body("planGoals.*.metrics").optional().isArray(),
  body("planGoals.*.metrics.*.name").optional().isString(),
  body("planGoals.*.metrics.*.target").optional().isNumeric(),
  body("contentStrategy").optional().isObject(),
  body("contentStrategy.approach").optional().isString(),
  body("contentStrategy.keyThemes").optional().isArray(),
  body("contentStrategy.keyThemes.*").optional().isString(),
  body("contentStrategy.distribution").optional().isObject(),
  body("timeline").optional().isArray(),
  body("timeline.*.date").optional().isISO8601(),
  body("timeline.*.description").optional().isString(),
  body("timeline.*.type").optional().isString(),
  body("timeline.*.status").optional().isIn(["pending", "in-progress", "completed"]),
  // Optional fields for micro plans
  body("contentSeries").optional().isObject(),
  body("contentSeries.name").optional().isString(),
  body("contentSeries.description").optional().isString(),
  body("contentSeries.expectedPieces").optional().isNumeric(),
  body("contentSeries.theme").optional().isString(),
  body("performanceMetrics").optional().isArray(),
  body("performanceMetrics.*.metricName").optional().isString(),
  body("performanceMetrics.*.target").optional().isNumeric(),
  body("performanceMetrics.*.actual").optional().isNumeric()
], validateRequest, createPlanHandler);

router.put("/:id", [
  transformDates([
    "dateRange.start", "dateRange.end",
    "timeline[].date"
  ]),
  sanitizeBody([
    "title", "dateRange", "dateRange.start", "dateRange.end",
    "goals", "targetAudience", "channels", "state", "isActive", "userId", "comments",
    "planGoals", "planGoals[].campaignGoalId", "planGoals[].description",
    "planGoals[].metrics", "planGoals[].metrics[].name", "planGoals[].metrics[].target",
    "contentStrategy", "contentStrategy.approach", "contentStrategy.keyThemes", "contentStrategy.distribution",
    "timeline", "timeline[].date", "timeline[].description", "timeline[].type", "timeline[].status",
    "contentSeries", "contentSeries.name", "contentSeries.description", "contentSeries.expectedPieces", "contentSeries.theme",
    "performanceMetrics", "performanceMetrics[].metricName", "performanceMetrics[].target", "performanceMetrics[].actual"
  ]),
  param("id").isString(),
  body("title").optional().isString(),
  body("dateRange").optional().isObject(),
  body("dateRange.start").optional().isISO8601(),
  body("dateRange.end").optional().isISO8601(),
  body("goals").optional().isArray(),
  body("goals.*").optional().isString(),
  body("targetAudience").optional().isString(),
  body("channels").optional().isArray(),
  body("channels.*").optional().isString(),
  body("state").optional().isIn(Object.values(PlanState)),
  body("isActive").optional().isBoolean(),
  body("userId").optional().isString(),
  body("comments").optional().isString(),
  // Optional fields for master plans
  body("planGoals").optional().isArray(),
  body("planGoals.*.campaignGoalId").optional().isString(),
  body("planGoals.*.description").optional().isString(),
  body("planGoals.*.metrics").optional().isArray(),
  body("planGoals.*.metrics.*.name").optional().isString(),
  body("planGoals.*.metrics.*.target").optional().isNumeric(),
  body("contentStrategy").optional().isObject(),
  body("contentStrategy.approach").optional().isString(),
  body("contentStrategy.keyThemes").optional().isArray(),
  body("contentStrategy.keyThemes.*").optional().isString(),
  body("contentStrategy.distribution").optional().isObject(),
  body("timeline").optional().isArray(),
  body("timeline.*.date").optional().isISO8601(),
  body("timeline.*.description").optional().isString(),
  body("timeline.*.type").optional().isString(),
  body("timeline.*.status").optional().isIn(["pending", "in-progress", "completed"]),
  // Optional fields for micro plans
  body("contentSeries").optional().isObject(),
  body("contentSeries.name").optional().isString(),
  body("contentSeries.description").optional().isString(),
  body("contentSeries.expectedPieces").optional().isNumeric(),
  body("contentSeries.theme").optional().isString(),
  body("performanceMetrics").optional().isArray(),
  body("performanceMetrics.*.metricName").optional().isString(),
  body("performanceMetrics.*.target").optional().isNumeric(),
  body("performanceMetrics.*.actual").optional().isNumeric()
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
