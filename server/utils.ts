import type { Response } from "express";

export function parseId(raw: string, res: Response): number | null {
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Gecersiz ID parametresi" });
    return null;
  }
  return id;
}
