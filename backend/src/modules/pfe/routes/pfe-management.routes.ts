import { Router } from "express";
import { requireAuth, requireRole } from "../../../middlewares/auth.middleware";
import {
  addJuryMemberHandler,
  createGroupeHandler,
  createSujetHandler,
  createVoeuHandler,
  deleteGroupeHandler,
  deleteJuryMemberHandler,
  deleteSujetHandler,
  deleteVoeuHandler,
  getAllGroupesHandler,
  getAllSujetsHandler,
  getGroupeByIdHandler,
  getJuryByGroupHandler,
  getSujetByIdHandler,
  getVoeuxByGroupHandler,
  updateJuryRoleHandler,
  updateSujetHandler,
  updateVoeuStatusHandler,
} from "../../../controllers/pfe/pfe-management.controller";

const router = Router();

router.use(requireAuth, requireRole(["admin", "vice_doyen", "enseignant"]));

router.post("/sujets", createSujetHandler);
router.get("/sujets", getAllSujetsHandler);
router.get("/sujets/:id", getSujetByIdHandler);
router.put("/sujets/:id", updateSujetHandler);
router.delete("/sujets/:id", deleteSujetHandler);

router.post("/groupes", createGroupeHandler);
router.get("/groupes", getAllGroupesHandler);
router.get("/groupes/:id", getGroupeByIdHandler);
router.delete("/groupes/:id", deleteGroupeHandler);

router.post("/jury/groupes/:groupId/membres", addJuryMemberHandler);
router.get("/jury/groupes/:groupId", getJuryByGroupHandler);
router.put("/jury/:id/role", updateJuryRoleHandler);
router.delete("/jury/:id", deleteJuryMemberHandler);

router.post("/voeux/groupes/:groupId", createVoeuHandler);
router.get("/voeux/groupes/:groupId", getVoeuxByGroupHandler);
router.put("/voeux/:id/status", updateVoeuStatusHandler);
router.delete("/voeux/:id", deleteVoeuHandler);

router.use("/comptes-rendus", (_req, res) => {
  return res.status(501).json({
    success: false,
    message: "Comptes-rendus route is temporarily disabled because the `PfeCompteRendu` Prisma model is not available in this backend schema.",
  });
});

export default router;
