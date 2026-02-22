export interface WasteValidationIssue {
  severity: "block" | "warn";
  message: string;
  field: string;
}

export interface WasteValidationResult {
  valid: boolean;
  issues: WasteValidationIssue[];
}

const EVIDENCE_REQUIRED_CATEGORIES = ["uretim_hatasi"];
const EVIDENCE_REQUIRED_SCOPES = [
  "production_defect",
  "logistics_cold_chain",
  "cold_chain_break",
  "contamination",
];

const LOT_ENCOURAGED_CATEGORIES = ["uretim_hatasi", "fire"];
const LOT_ENCOURAGED_SCOPES = [
  "production_defect",
  "logistics_cold_chain",
  "raw_material_quality",
];

export function validateWasteEvent(data: {
  categoryCode?: string;
  reasonId?: number;
  quantity?: number | string;
  unit?: string;
  notes?: string;
  evidencePhotos?: any[];
  responsibilityScope?: string;
  lotId?: string | null;
}): WasteValidationResult {
  const issues: WasteValidationIssue[] = [];

  if (!data.reasonId) {
    issues.push({
      severity: "block",
      message: "Neden seçimi zorunludur",
      field: "reasonId",
    });
  }

  const qty = typeof data.quantity === "string" ? parseFloat(data.quantity) : data.quantity;
  if (!qty || qty <= 0) {
    issues.push({
      severity: "block",
      message: "Miktar sıfırdan büyük olmalıdır",
      field: "quantity",
    });
  }

  if (!data.unit) {
    issues.push({
      severity: "block",
      message: "Birim seçimi zorunludur",
      field: "unit",
    });
  }

  const noteLen = (data.notes || "").trim().length;
  if (noteLen < 10) {
    issues.push({
      severity: "block",
      message: "Açıklama en az 10 karakter olmalıdır",
      field: "notes",
    });
  }

  const photos = data.evidencePhotos || [];
  const needsEvidence =
    EVIDENCE_REQUIRED_CATEGORIES.includes(data.categoryCode || "") ||
    EVIDENCE_REQUIRED_SCOPES.includes(data.responsibilityScope || "");

  if (needsEvidence && photos.length === 0) {
    issues.push({
      severity: "block",
      message: "Bu kategori/kapsam için fotoğraf kanıtı zorunludur",
      field: "evidencePhotos",
    });
  }

  if (photos.length === 0 && !needsEvidence) {
    issues.push({
      severity: "warn",
      message: "Fotoğraf eklenmedi, eklemeniz önerilir",
      field: "evidencePhotos",
    });
  }

  const needsLot =
    LOT_ENCOURAGED_CATEGORIES.includes(data.categoryCode || "") ||
    LOT_ENCOURAGED_SCOPES.includes(data.responsibilityScope || "");

  if (needsLot && !data.lotId) {
    issues.push({
      severity: "warn",
      message: "Lot numarası girilmedi, izlenebilirlik için önerilir",
      field: "lotId",
    });
  }

  const hasBlocking = issues.some((i) => i.severity === "block");

  return {
    valid: !hasBlocking,
    issues,
  };
}
