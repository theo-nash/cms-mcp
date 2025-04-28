import { Router, RequestHandler } from "express";
import { body, param } from "express-validator";
import { PlanService } from "../../services/plan.service.js";
import { validateRequest } from "../middleware/validate.js";
import { PlanType, PlanState, Plan } from "../../models/plan.model.js";
import { PlanRepository } from "../../repositories/plan.repository.js";

const router = Router();
const planService = new PlanService();
const planRepository = new PlanRepository();

/**
 * @swagger
 * /api/v1/plans:
 *   get:
 *     summary: List all plans
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
 *     responses:
 *       200:
 *         description: List of plans
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Plan'
 */
const getAllPlansHandler: RequestHandler = async (req, res, next) => {
  try {
    const { brandId, type } = req.query;
    let plans: Plan[];

    if (brandId) {
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
 *     responses:
 *       200:
 *         description: Plan details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Plan'
 *       404:
 *         description: Plan not found
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
 *               title:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [master, micro]
 *               parentPlanId:
 *                 type: string
 *               campaignId:
 *                 type: string
 *               dateRange:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     format: date-time
 *                   end:
 *                     type: string
 *                     format: date-time
 *               goals:
 *                 type: array
 *                 items:
 *                   type: string
 *               targetAudience:
 *                 type: string
 *               channels:
 *                 type: array
 *                 items:
 *                   type: string
 *               userId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Plan created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Plan'
 */
const createPlanHandler: RequestHandler = async (req, res, next) => {
  try {
    const plan = await planService.createPlan(req.body);
    void res.status(201).json(plan);
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PlanUpdate'
 *     responses:
 *       200:
 *         description: Plan updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Plan'
 *       404:
 *         description: Plan not found
 */
const updatePlanHandler: RequestHandler = async (req, res, next) => {
  try {
    const plan = await planService.updatePlan(
      req.params.id,
      req.body,
      req.body.userId
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
 *               userId:
 *                 type: string
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Plan state updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Plan'
 *       404:
 *         description: Plan not found
 */
const updatePlanStateHandler: RequestHandler = async (req, res, next) => {
  try {
    const plan = await planService.transitionPlanState(
      req.params.id,
      req.body.state,
      {
        userId: req.body.userId,
        comments: req.body.comments,
      }
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

router.get("/", getAllPlansHandler);
router.get("/:id", param("id").isString(), validateRequest, getPlanByIdHandler);
router.post(
  "/",
  [
    body("brandId").isString().notEmpty(),
    body("title").isString().notEmpty(),
    body("type").isIn(["master", "micro"]),
    body("parentPlanId").optional().isString(),
    body("campaignId").optional().isString(),
    body("dateRange").isObject(),
    body("dateRange.start").isISO8601(),
    body("dateRange.end").isISO8601(),
    body("goals").isArray(),
    body("targetAudience").isString().notEmpty(),
    body("channels").isArray(),
    body("userId").isString().notEmpty(),
  ],
  validateRequest,
  createPlanHandler
);
router.put(
  "/:id",
  [
    param("id").isString(),
    body("title").optional().isString(),
    body("dateRange").optional().isObject(),
    body("dateRange.start").optional().isISO8601(),
    body("dateRange.end").optional().isISO8601(),
    body("goals").optional().isArray(),
    body("targetAudience").optional().isString(),
    body("channels").optional().isArray(),
    body("userId").isString().notEmpty(),
  ],
  validateRequest,
  updatePlanHandler
);
router.put(
  "/:id/state",
  [
    param("id").isString(),
    body("state").isIn(Object.values(PlanState)),
    body("userId").isString().notEmpty(),
    body("comments").optional().isString(),
  ],
  validateRequest,
  updatePlanStateHandler
);

export const planRoutes = router;
