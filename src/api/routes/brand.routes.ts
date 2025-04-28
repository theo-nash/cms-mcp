import { Router, RequestHandler } from "express";
import { body, param } from "express-validator";
import { BrandService } from "../../services/brand.service.js";
import { validateRequest } from "../middleware/validate.js";

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
 *     responses:
 *       200:
 *         description: Brand details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Brand'
 *       404:
 *         description: Brand not found
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
 *               description:
 *                 type: string
 *               guidelines:
 *                 type: object
 *                 properties:
 *                   tone:
 *                     type: array
 *                     items:
 *                       type: string
 *                   vocabulary:
 *                     type: array
 *                     items:
 *                       type: string
 *                   avoidedTerms:
 *                     type: array
 *                     items:
 *                       type: string
 *                   visualIdentity:
 *                     type: object
 *                     properties:
 *                       primaryColor:
 *                         type: string
 *                       secondaryColor:
 *                         type: string
 *     responses:
 *       201:
 *         description: Brand created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Brand'
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BrandUpdate'
 *     responses:
 *       200:
 *         description: Brand updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Brand'
 *       404:
 *         description: Brand not found
 */
const updateBrandHandler: RequestHandler = async (req, res, next) => {
  try {
    const brand = await brandService.updateBrand(req.params.id, req.body);
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
    body("name").isString().notEmpty(),
    body("description").isString().notEmpty(),
    body("guidelines").optional().isObject(),
    body("guidelines.tone").optional().isArray(),
    body("guidelines.vocabulary").optional().isArray(),
    body("guidelines.avoidedTerms").optional().isArray(),
    body("guidelines.visualIdentity").optional().isObject(),
    body("guidelines.visualIdentity.primaryColor").optional().isString(),
    body("guidelines.visualIdentity.secondaryColor").optional().isString(),
  ],
  validateRequest,
  createBrandHandler
);
router.put(
  "/:id",
  [
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
  ],
  validateRequest,
  updateBrandHandler
);

export const brandRoutes = router;
