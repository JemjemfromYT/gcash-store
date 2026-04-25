import { Router, type IRouter } from "express";
import healthRouter from "./health";
import checkoutRouter from "./checkout";
import profileRouter from "./profile";

const router: IRouter = Router();

router.use(healthRouter);
router.use(checkoutRouter);
router.use(profileRouter);

export default router;
