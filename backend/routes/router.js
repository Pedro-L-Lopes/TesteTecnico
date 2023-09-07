import { Router } from "express";
import {
  changePrice,
  getPacks,
  getProducts,
} from "../controllers/ProductController.js";

const router = Router();

router.get("/", getProducts);
router.get("/packs", getPacks);
router.post("/products", changePrice);

export { router };
