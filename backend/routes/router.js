import { Router } from "express";
import {
  changePrice,
  getPackById,
  getPacks,
  getProducts,
} from "../controllers/ProductController.js";

const router = Router();

router.get("/", getProducts);
router.get("/packs", getPacks);
router.post("/pack", getPackById);
router.post("/products", changePrice);

export { router };
