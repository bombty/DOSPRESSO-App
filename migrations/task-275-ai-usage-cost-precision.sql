-- Task #275 follow-up: widen ai_usage_logs.cost_usd precision so small token
-- costs (embeddings, gpt-4o-mini) are not rounded to zero by numeric(10,4).
-- Old: numeric(10,4) -> min representable cost = $0.0001
-- New: numeric(14,6) -> min representable cost = $0.000001
-- This matches logCall(): costUsd.toFixed(6).
ALTER TABLE ai_usage_logs
  ALTER COLUMN cost_usd TYPE numeric(14, 6)
  USING cost_usd::numeric(14, 6);
