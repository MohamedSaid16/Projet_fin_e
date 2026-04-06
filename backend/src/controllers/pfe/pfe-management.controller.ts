import { Request, Response } from "express";
import { Prisma, RoleJury, StatusGroupSujet, StatusSujet, TypeProjet } from "@prisma/client";
import prisma from "../../config/database";

const toInt = (value: unknown): number | null => {
  const parsed = parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const toDateOrNull = (value: unknown): Date | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toTypeProjet = (value: unknown): TypeProjet | undefined => {
  if (!value) {
    return undefined;
  }
  const candidate = String(value).toLowerCase();
  if (candidate === "recherche" || candidate === "application" || candidate === "etude" || candidate === "innovation") {
    return candidate as TypeProjet;
  }
  return undefined;
};

const toStatusSujet = (value: unknown): StatusSujet | undefined => {
  if (!value) {
    return undefined;
  }
  const candidate = String(value).toLowerCase();
  if (candidate === "propose" || candidate === "valide" || candidate === "reserve" || candidate === "affecte" || candidate === "termine") {
    return candidate as StatusSujet;
  }
  return undefined;
};

const toRoleJury = (value: unknown): RoleJury => {
  const candidate = String(value || "").toLowerCase();
  if (candidate === "president") {
    return RoleJury.president;
  }
  if (candidate === "rapporteur") {
    return RoleJury.rapporteur;
  }
  return RoleJury.examinateur;
};

const toStatusGroupSujet = (value: unknown): StatusGroupSujet => {
  const candidate = String(value || "").toLowerCase();
  if (candidate === "accepte") {
    return StatusGroupSujet.accepte;
  }
  if (candidate === "refuse") {
    return StatusGroupSujet.refuse;
  }
  return StatusGroupSujet.en_attente;
};

export const createSujetHandler = async (req: Request, res: Response) => {
  try {
    const enseignantId = toInt(req.body?.enseignantId);
    const promoId = toInt(req.body?.promoId);
    const anneeUniversitaire = String(req.body?.anneeUniversitaire || "").trim();

    if (!req.body?.titre || !req.body?.description || !enseignantId || !promoId || !anneeUniversitaire) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const sujetsCount = await prisma.pfeSujet.count({
      where: {
        enseignantId,
        anneeUniversitaire,
      },
    });

    if (sujetsCount >= 3) {
      return res.status(400).json({
        success: false,
        error: "Un enseignant ne peut pas proposer plus de 3 sujets par année universitaire",
      });
    }

    const sujet = await prisma.pfeSujet.create({
      data: {
        titre: String(req.body.titre),
        description: String(req.body.description),
        keywords: req.body.keywords ? String(req.body.keywords) : null,
        enseignantId,
        promoId,
        workplan: req.body.workplan ? String(req.body.workplan) : null,
        bibliographie: req.body.bibliographie ? String(req.body.bibliographie) : null,
        typeProjet: toTypeProjet(req.body.typeProjet) || TypeProjet.application,
        status: toStatusSujet(req.body.status) || StatusSujet.propose,
        anneeUniversitaire,
        maxGrps: toInt(req.body.maxGrps) || 1,
      },
      include: {
        enseignant: { include: { user: true } },
        promo: true,
      },
    });

    return res.status(201).json({ success: true, data: sujet });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Erreur lors de la création du sujet" });
  }
};

export const getAllSujetsHandler = async (_req: Request, res: Response) => {
  try {
    const sujets = await prisma.pfeSujet.findMany({
      include: {
        enseignant: { include: { user: true } },
        promo: true,
      },
      orderBy: { id: "desc" },
    });

    return res.status(200).json({ success: true, data: sujets });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Erreur lors de la récupération des sujets" });
  }
};

export const getSujetByIdHandler = async (req: Request, res: Response) => {
  try {
    const id = toInt(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, error: "Invalid subject ID" });
    }

    const sujet = await prisma.pfeSujet.findUnique({
      where: { id },
      include: {
        enseignant: { include: { user: true } },
        promo: true,
        groupSujets: true,
      },
    });

    if (!sujet) {
      return res.status(404).json({ success: false, error: "Sujet non trouvé" });
    }

    return res.status(200).json({ success: true, data: sujet });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Erreur lors de la récupération du sujet" });
  }
};

export const updateSujetHandler = async (req: Request, res: Response) => {
  try {
    const id = toInt(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, error: "Invalid subject ID" });
    }

    const updateData: Prisma.PfeSujetUpdateInput = {
      titre: req.body?.titre ? String(req.body.titre) : undefined,
      description: req.body?.description ? String(req.body.description) : undefined,
      keywords: req.body?.keywords ? String(req.body.keywords) : undefined,
      workplan: req.body?.workplan ? String(req.body.workplan) : undefined,
      bibliographie: req.body?.bibliographie ? String(req.body.bibliographie) : undefined,
      typeProjet: toTypeProjet(req.body?.typeProjet),
      status: toStatusSujet(req.body?.status),
      anneeUniversitaire: req.body?.anneeUniversitaire ? String(req.body.anneeUniversitaire) : undefined,
      maxGrps: toInt(req.body?.maxGrps) || undefined,
    };

    const enseignantId = toInt(req.body?.enseignantId);
    if (enseignantId) {
      updateData.enseignant = { connect: { id: enseignantId } };
    }

    const promoId = toInt(req.body?.promoId);
    if (promoId) {
      updateData.promo = { connect: { id: promoId } };
    }

    const sujet = await prisma.pfeSujet.update({
      where: { id },
      data: updateData,
    });

    return res.status(200).json({ success: true, data: sujet });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Erreur lors de la mise à jour du sujet" });
  }
};

export const deleteSujetHandler = async (req: Request, res: Response) => {
  try {
    const id = toInt(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, error: "Invalid subject ID" });
    }

    await prisma.pfeSujet.delete({ where: { id } });
    return res.status(200).json({ success: true, message: "Sujet supprimé avec succès" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Erreur lors de la suppression du sujet" });
  }
};

export const createGroupeHandler = async (req: Request, res: Response) => {
  try {
    const nom = String(req.body?.nom || "").trim();
    const sujetFinalId = toInt(req.body?.sujetFinalId);
    const coEncadrantId = toInt(req.body?.coEncadrantId);

    if (!nom || !sujetFinalId || !coEncadrantId) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const groupe = await prisma.groupPfe.create({
      data: {
        nom,
        sujetFinalId,
        coEncadrantId,
        dateCreation: toDateOrNull(req.body?.dateCreation),
        dateAffectation: toDateOrNull(req.body?.dateAffectation),
        dateSoutenance: toDateOrNull(req.body?.dateSoutenance),
        salleSoutenance: req.body?.salleSoutenance ? String(req.body.salleSoutenance) : null,
        note: req.body?.note ? new Prisma.Decimal(String(req.body.note)) : null,
        mention: req.body?.mention || undefined,
      },
      include: {
        sujetFinal: true,
        coEncadrant: { include: { user: true } },
        groupMembers: {
          include: {
            etudiant: { include: { user: true } },
          },
        },
      },
    });

    return res.status(201).json({ success: true, data: groupe });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Erreur lors de la création du groupe" });
  }
};

export const getAllGroupesHandler = async (_req: Request, res: Response) => {
  try {
    const groupes = await prisma.groupPfe.findMany({
      include: {
        sujetFinal: true,
        coEncadrant: { include: { user: true } },
        groupMembers: {
          include: {
            etudiant: { include: { user: true } },
          },
        },
        pfeJury: {
          include: {
            enseignant: { include: { user: true } },
          },
        },
      },
      orderBy: { id: "desc" },
    });

    return res.status(200).json({ success: true, data: groupes });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Erreur lors de la récupération des groupes" });
  }
};

export const getGroupeByIdHandler = async (req: Request, res: Response) => {
  try {
    const id = toInt(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, error: "Invalid group ID" });
    }

    const groupe = await prisma.groupPfe.findUnique({
      where: { id },
      include: {
        sujetFinal: true,
        coEncadrant: { include: { user: true } },
        groupMembers: {
          include: {
            etudiant: { include: { user: true } },
          },
        },
        groupSujets: { include: { sujet: true } },
        pfeJury: { include: { enseignant: { include: { user: true } } } },
      },
    });

    if (!groupe) {
      return res.status(404).json({ success: false, error: "Groupe non trouvé" });
    }

    return res.status(200).json({ success: true, data: groupe });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Erreur lors de la récupération du groupe" });
  }
};

export const deleteGroupeHandler = async (req: Request, res: Response) => {
  try {
    const id = toInt(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, error: "Invalid group ID" });
    }

    await prisma.groupPfe.delete({ where: { id } });
    return res.status(200).json({ success: true, message: "Groupe supprimé avec succès" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Erreur lors de la suppression du groupe" });
  }
};

export const addJuryMemberHandler = async (req: Request, res: Response) => {
  try {
    const groupId = toInt(req.params.groupId);
    const enseignantId = toInt(req.body?.enseignantId);

    if (!groupId || !enseignantId) {
      return res.status(400).json({ success: false, error: "Invalid group ID or teacher ID" });
    }

    const juryExistant = await prisma.pfeJury.findFirst({
      where: {
        enseignantId,
        groupId: { not: groupId },
      },
    });

    if (juryExistant) {
      return res.status(400).json({
        success: false,
        error: "Cet enseignant est déjà membre d'un jury pour un autre groupe",
      });
    }

    const jury = await prisma.pfeJury.create({
      data: {
        groupId,
        enseignantId,
        role: toRoleJury(req.body?.role),
      },
      include: {
        group: true,
        enseignant: { include: { user: true } },
      },
    });

    return res.status(201).json({ success: true, data: jury });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Erreur lors de l'ajout au jury" });
  }
};

export const getJuryByGroupHandler = async (req: Request, res: Response) => {
  try {
    const groupId = toInt(req.params.groupId);
    if (!groupId) {
      return res.status(400).json({ success: false, error: "Invalid group ID" });
    }

    const jury = await prisma.pfeJury.findMany({
      where: { groupId },
      include: { enseignant: { include: { user: true } } },
      orderBy: { id: "desc" },
    });

    return res.status(200).json({ success: true, data: jury });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Erreur lors de la récupération du jury" });
  }
};

export const updateJuryRoleHandler = async (req: Request, res: Response) => {
  try {
    const id = toInt(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, error: "Invalid jury ID" });
    }

    const jury = await prisma.pfeJury.update({
      where: { id },
      data: { role: toRoleJury(req.body?.role) },
      include: {
        enseignant: { include: { user: true } },
      },
    });

    return res.status(200).json({ success: true, data: jury });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Erreur lors de la mise à jour du rôle jury" });
  }
};

export const deleteJuryMemberHandler = async (req: Request, res: Response) => {
  try {
    const id = toInt(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, error: "Invalid jury ID" });
    }

    await prisma.pfeJury.delete({ where: { id } });
    return res.status(200).json({ success: true, message: "Membre supprimé du jury" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Erreur lors de la suppression du membre du jury" });
  }
};

export const createVoeuHandler = async (req: Request, res: Response) => {
  try {
    const groupId = toInt(req.params.groupId);
    const sujetId = toInt(req.body?.sujetId);
    const ordre = toInt(req.body?.ordre);

    if (!groupId || !sujetId || !ordre) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const voeu = await prisma.groupSujet.create({
      data: {
        groupId,
        sujetId,
        ordre,
        status: StatusGroupSujet.en_attente,
      },
      include: {
        group: true,
        sujet: {
          include: {
            enseignant: { include: { user: true } },
          },
        },
      },
    });

    return res.status(201).json({ success: true, data: voeu });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Erreur lors de la création du voeu" });
  }
};

export const getVoeuxByGroupHandler = async (req: Request, res: Response) => {
  try {
    const groupId = toInt(req.params.groupId);
    if (!groupId) {
      return res.status(400).json({ success: false, error: "Invalid group ID" });
    }

    const voeux = await prisma.groupSujet.findMany({
      where: { groupId },
      include: {
        sujet: {
          include: {
            enseignant: { include: { user: true } },
          },
        },
      },
      orderBy: { ordre: "asc" },
    });

    return res.status(200).json({ success: true, data: voeux });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Erreur lors de la récupération des voeux" });
  }
};

export const updateVoeuStatusHandler = async (req: Request, res: Response) => {
  try {
    const id = toInt(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, error: "Invalid voeu ID" });
    }

    const voeu = await prisma.groupSujet.update({
      where: { id },
      data: { status: toStatusGroupSujet(req.body?.status) },
      include: {
        group: true,
        sujet: true,
      },
    });

    return res.status(200).json({ success: true, data: voeu });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Erreur lors de la mise à jour du voeu" });
  }
};

export const deleteVoeuHandler = async (req: Request, res: Response) => {
  try {
    const id = toInt(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, error: "Invalid voeu ID" });
    }

    await prisma.groupSujet.delete({ where: { id } });
    return res.status(200).json({ success: true, message: "Voeu supprimé" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Erreur lors de la suppression du voeu" });
  }
};
