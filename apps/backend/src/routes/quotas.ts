/**
 * Quota API Routes — Cascading Pool Management
 */
import { Router, Request, Response } from "express";
import {
  getPoolStatus,
  getPoolAvailable,
  validateQuotaAllocation,
  getParentModules,
} from "../services/quotaService";

const router = Router();

/**
 * GET /api/quotas/:parentLicenseId/status
 * Returns full pool status: limits, consumed, available, modules
 */
router.get("/:parentLicenseId/status", async (req: Request, res: Response) => {
  try {
    const status = await getPoolStatus(req.params.parentLicenseId);
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/quotas/:parentLicenseId/available
 * Returns remaining allocatable resources
 */
router.get("/:parentLicenseId/available", async (req: Request, res: Response) => {
  try {
    const available = await getPoolAvailable(req.params.parentLicenseId);
    res.json(available);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/quotas/:parentLicenseId/modules
 * Returns which modules the parent has enabled
 */
router.get("/:parentLicenseId/modules", async (req: Request, res: Response) => {
  try {
    const modules = await getParentModules(req.params.parentLicenseId);
    res.json(modules);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/quotas/validate
 * Validates a child license allocation against parent pool
 * Body: { parent_license_id, child_license_id?, attendants, devices_web, devices_meta, messages?, storage_gb?, ai_agents?, has_ai_module? }
 */
router.post("/validate", async (req: Request, res: Response) => {
  try {
    const result = await validateQuotaAllocation({
      parent_license_id: req.body.parent_license_id,
      child_license_id: req.body.child_license_id || null,
      attendants: req.body.attendants ?? 0,
      devices_web: req.body.devices_web ?? 0,
      devices_meta: req.body.devices_meta ?? 0,
      messages: req.body.messages ?? 0,
      storage_gb: req.body.storage_gb ?? 0,
      ai_agents: req.body.ai_agents ?? 0,
      has_ai_module: req.body.has_ai_module ?? false,
    });

    if (!result.valid) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
