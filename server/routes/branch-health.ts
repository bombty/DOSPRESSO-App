import { Router } from "express";
import { isAuthenticated } from "../localAuth";
import { isHQRole, isBranchRole, type UserRoleType } from "@shared/schema";
import { computeBranchHealthScores } from "../services/branch-health-scoring";

const router = Router();

const VALID_RANGES: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

router.get("/api/reports/branch-health", isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    const rangeParam = (req.query.range as string) || "30d";
    const rangeDays = VALID_RANGES[rangeParam];

    if (!rangeDays) {
      return res.status(400).json({
        message: "Geçersiz aralık. Geçerli değerler: 7d, 30d, 90d",
      });
    }

    let branchIds: number[] | undefined;

    const role = user.role as UserRoleType;

    if (isHQRole(role)) {
      const queryBranchId = req.query.branchId
        ? parseInt(req.query.branchId as string)
        : undefined;
      if (queryBranchId && !isNaN(queryBranchId)) {
        branchIds = [queryBranchId];
      }
    } else if (isBranchRole(role)) {
      if (!user.branchId) {
        return res.json({
          range: rangeParam,
          generatedAt: new Date().toISOString(),
          branches: [],
        });
      }
      branchIds = [user.branchId];
    } else {
      if (user.branchId) {
        branchIds = [user.branchId];
      }
    }

    const report = await computeBranchHealthScores({
      rangeDays,
      branchIds,
    });

    res.json(report);
  } catch (error: any) {
    res.status(500).json({
      message: "Şube sağlık skorları hesaplanırken hata oluştu",
    });
  }
});

export function registerBranchHealthRoutes(app: any) {
  app.use(router);
}
