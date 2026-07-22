import { Router, type IRouter } from "express";
import healthRouter from "./health";
import imagesRouter from "./images";
import collectionsRouter from "./collections";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(imagesRouter);
router.use(collectionsRouter);
router.use(analyticsRouter);

export default router;
