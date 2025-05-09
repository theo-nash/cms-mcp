import { Router, RequestHandler } from "express";
import { body, param } from "express-validator";
import { BrandService } from "../../services/brand.service.js";
import { validateRequest } from "../middleware/validate.js";
import { sanitizeBody, transformCasing } from "../middleware/transform.js";
import { BrandUpdateSchema } from "../../models/brand.model.js";

const router = Router();
const brandService = new BrandService();

/**
 * @swagger
 * /api/v1/brands:
 *   get:
 *     summary: List all brands
 *     tags: [Brands]
 *     responses:
 *       200:
 *         description: List of brands
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Brand'
 *       500:
 *         description: Internal server error
 */
const getAllBrandsHandler: RequestHandler = async (req, res, next) => {
  try {
    const brands = await brandService.getAllBrands();
    void res.json(brands);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/brands/{id}:
 *   get:
 *     summary: Get brand by ID
 *     tags: [Brands]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Brand ID
 *     responses:
 *       200:
 *         description: Brand details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Brand'
 *       404:
 *         description: Brand not found
 *       500:
 *         description: Internal server error
 */
const getBrandByIdHandler: RequestHandler = async (req, res, next) => {
  try {
    const brand = await brandService.getBrand(req.params.id);
    if (!brand) {
      void res.status(404).json({ message: "Brand not found" });
      return;
    }
    void res.json(brand);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/brands:
 *   post:
 *     summary: Create new brand
 *     tags: [Brands]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the brand
 *               description:
 *                 type: string
 *                 description: Description of the brand
 *               guidelines:
 *                 type: object
 *                 description: Brand guidelines
 *                 properties:
 *                   tone:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: List of tone guidelines
 *                   vocabulary:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: List of vocabulary guidelines
 *                   avoidedTerms:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: List of terms to avoid
 *                   visualIdentity:
 *                     type: object
 *                     description: Visual identity guidelines
 *                     properties:
 *                       primaryColor:
 *                         type: string
 *                         description: Primary brand color
 *                       secondaryColor:
 *                         type: string
 *                         description: Secondary brand color
 *     responses:
 *       201:
 *         description: Brand created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Brand'
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */
const createBrandHandler: RequestHandler = async (req, res, next) => {
  try {
    const brand = await brandService.createBrand(req.body);
    void res.status(201).json(brand);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/brands/{id}:
 *   put:
 *     summary: Update brand
 *     tags: [Brands]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Brand ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the brand
 *               description:
 *                 type: string
 *                 description: Description of the brand
 *               guidelines:
 *                 type: object
 *                 description: Brand guidelines
 *                 properties:
 *                   tone:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: List of tone guidelines
 *                   vocabulary:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: List of vocabulary guidelines
 *                   avoidedTerms:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: List of terms to avoid
 *                   visualIdentity:
 *                     type: object
 *                     description: Visual identity guidelines
 *                     properties:
 *                       primaryColor:
 *                         type: string
 *                         description: Primary brand color
 *                       secondaryColor:
 *                         type: string
 *                         description: Secondary brand color
 *     responses:
 *       200:
 *         description: Brand updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Brand'
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Brand not found
 *       500:
 *         description: Internal server error
 */
const updateBrandHandler: RequestHandler = async (req, res, next) => {
  try {
    // Create a sanitized update object instead of passing req.body directly
    const updateData = BrandUpdateSchema.parse(req.body);

    const brand = await brandService.updateBrand(updateData);
    if (!brand) {
      void res.status(404).json({ message: "Brand not found" });
      return;
    }
    void res.json(brand);
  } catch (error) {
    next(error);
  }
};

router.get("/", getAllBrandsHandler);
router.get("/:id", param("id").isString(), validateRequest, getBrandByIdHandler);
router.post(
  "/",
  [
    // Apply middleware to transform snake_case to camelCase 
    transformCasing({
      "guidelines.avoided_terms": "guidelines.avoidedTerms",
      "guidelines.visual_identity.primary_color": "guidelines.visualIdentity.primaryColor",
      "guidelines.visual_identity.secondary_color": "guidelines.visualIdentity.secondaryColor",
      "guidelines.narratives.elevator_pitch": "guidelines.narratives.elevatorPitch",
      "guidelines.narratives.short_narrative": "guidelines.narratives.shortNarrative",
      "guidelines.narratives.full_narrative": "guidelines.narratives.fullNarrative",
      "guidelines.key_messages": "guidelines.keyMessages",
      "guidelines.key_messages[].audience_segment": "guidelines.keyMessages[].audienceSegment"
    }),
    // Sanitize body to only include expected fields
    sanitizeBody([
      "name", "description", "guidelines",
      "guidelines.tone", "guidelines.vocabulary", "guidelines.avoidedTerms",
      "guidelines.visualIdentity", "guidelines.visualIdentity.primaryColor",
      "guidelines.visualIdentity.secondaryColor",
      "guidelines.narratives", "guidelines.narratives.elevatorPitch",
      "guidelines.narratives.shortNarrative", "guidelines.narratives.fullNarrative",
      "guidelines.keyMessages", "guidelines.keyMessages[].audienceSegment",
      "guidelines.keyMessages[].message"
    ]),
    body("name").isString().notEmpty(),
    body("description").isString().notEmpty(),
    body("guidelines").optional().isObject(),
    body("guidelines.tone").optional().isArray(),
    body("guidelines.vocabulary").optional().isArray(),
    body("guidelines.avoidedTerms").optional().isArray(),
    body("guidelines.visualIdentity").optional().isObject(),
    body("guidelines.visualIdentity.primaryColor").optional().isString(),
    body("guidelines.visualIdentity.secondaryColor").optional().isString(),
    body("guidelines.narratives").optional().isObject(),
    body("guidelines.narratives.elevatorPitch").optional().isString(),
    body("guidelines.narratives.shortNarrative").optional().isString(),
    body("guidelines.narratives.fullNarrative").optional().isString(),
    body("guidelines.keyMessages").optional().isArray(),
    body("guidelines.keyMessages.*.audienceSegment").optional().isString(),
    body("guidelines.keyMessages.*.message").optional().isString()
  ],
  validateRequest,
  createBrandHandler
);
router.put(
  "/:id",
  [
    transformCasing({
      "guidelines.avoided_terms": "guidelines.avoidedTerms",
      "guidelines.visual_identity.primary_color": "guidelines.visualIdentity.primaryColor",
      "guidelines.visual_identity.secondary_color": "guidelines.visualIdentity.secondaryColor",
      "guidelines.narratives.elevator_pitch": "guidelines.narratives.elevatorPitch",
      "guidelines.narratives.short_narrative": "guidelines.narratives.shortNarrative",
      "guidelines.narratives.full_narrative": "guidelines.narratives.fullNarrative",
      "guidelines.key_messages": "guidelines.keyMessages",
      "guidelines.key_messages[].audience_segment": "guidelines.keyMessages[].audienceSegment"
    }),
    sanitizeBody([
      "name", "description", "guidelines",
      "guidelines.tone", "guidelines.vocabulary", "guidelines.avoidedTerms",
      "guidelines.visualIdentity", "guidelines.visualIdentity.primaryColor",
      "guidelines.visualIdentity.secondaryColor",
      "guidelines.narratives", "guidelines.narratives.elevatorPitch",
      "guidelines.narratives.shortNarrative", "guidelines.narratives.fullNarrative",
      "guidelines.keyMessages", "guidelines.keyMessages[].audienceSegment",
      "guidelines.keyMessages[].message"
    ]),
    param("id").isString(),
    body("name").optional().isString(),
    body("description").optional().isString(),
    body("guidelines").optional().isObject(),
    body("guidelines.tone").optional().isArray(),
    body("guidelines.vocabulary").optional().isArray(),
    body("guidelines.avoidedTerms").optional().isArray(),
    body("guidelines.visualIdentity").optional().isObject(),
    body("guidelines.visualIdentity.primaryColor").optional().isString(),
    body("guidelines.visualIdentity.secondaryColor").optional().isString(),
    body("guidelines.narratives").optional().isObject(),
    body("guidelines.narratives.elevatorPitch").optional().isString(),
    body("guidelines.narratives.shortNarrative").optional().isString(),
    body("guidelines.narratives.fullNarrative").optional().isString(),
    body("guidelines.keyMessages").optional().isArray(),
    body("guidelines.keyMessages.*.audienceSegment").optional().isString(),
    body("guidelines.keyMessages.*.message").optional().isString()
  ],
  validateRequest,
  updateBrandHandler
);

export const brandRoutes = router;
