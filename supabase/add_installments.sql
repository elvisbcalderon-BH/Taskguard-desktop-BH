-- ========================================================================
-- TaskGuard Desktop: Soporte para Cuotas e Historial de Abonos (Installments)
-- ========================================================================

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS installments JSONB NOT NULL DEFAULT '[]'::jsonb;
