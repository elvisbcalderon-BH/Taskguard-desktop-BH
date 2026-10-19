-- ========================================================================
-- TaskGuard Desktop: Actualización de Esquema (Negocio BH, Monto y Recurrencia)
-- ========================================================================

-- 1. Agregar 'Negocio (BH)' al enum de task_category si existe, o alterar el tipo
DO $$ 
BEGIN
    ALTER TYPE public.task_category ADD VALUE IF NOT EXISTS 'Negocio (BH)';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Agregar columnas amount y recurring_monthly a tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00;

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS recurring_monthly BOOLEAN NOT NULL DEFAULT false;

-- 3. Semillas de Blessing Hands (BH) y Casa
INSERT INTO public.tasks (title, description, category, priority, amount, due_date, recurring_monthly, phi_flag, bot_access)
VALUES 
('Chat GPT (Blessing Hands)', 'Suscripción mensual de IA para la empresa.', 'Negocio (BH)', 'urgent_important', 55.00, '2026-10-16', true, false, true),
('BH Cell Phone (Blessing Hands)', 'Línea telefónica corporativa BH.', 'Negocio (BH)', 'urgent_important', 9.00, '2026-10-19', true, false, true),
('iFax (Blessing Hands)', 'Servicio de fax médico y administrativo BH.', 'Negocio (BH)', 'urgent_important', 55.00, '2026-10-24', true, false, true),
('Alquiler / Hipoteca (Casa)', 'Pago mensual de vivienda.', 'Administrativa', 'urgent_important', 1300.00, '2026-09-30', true, false, false)
ON CONFLICT DO NOTHING;
