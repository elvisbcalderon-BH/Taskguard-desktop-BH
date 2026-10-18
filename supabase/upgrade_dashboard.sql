-- ========================================================================
-- TaskGuard Desktop: Actualización de Esquema (Categorías & Modo Desarrollo/Anon)
-- ========================================================================

-- 1. Agregar tipo enum y columna category si no existen
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_category') THEN
        CREATE TYPE public.task_category AS ENUM ('Clinica', 'Administrativa', 'Personal');
    END IF;
END $$;

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS category public.task_category NOT NULL DEFAULT 'Clinica';

-- Permitir user_id nullable o default para soportar sesiones anónimas de escritorio en modo offline/dev
ALTER TABLE public.tasks ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.bot_authorizations ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.bot_audit_logs ALTER COLUMN user_id DROP NOT NULL;

-- 2. Habilitar políticas RLS para anon y authenticated
DROP POLICY IF EXISTS "Anon and authenticated can manage tasks" ON public.tasks;
CREATE POLICY "Anon and authenticated can manage tasks"
    ON public.tasks
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Anon and authenticated can manage bot authorizations" ON public.bot_authorizations;
CREATE POLICY "Anon and authenticated can manage bot authorizations"
    ON public.bot_authorizations
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Anon and authenticated can read audit logs" ON public.bot_audit_logs;
CREATE POLICY "Anon and authenticated can read audit logs"
    ON public.bot_audit_logs
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Anon and authenticated can insert audit logs" ON public.bot_audit_logs;
CREATE POLICY "Anon and authenticated can insert audit logs"
    ON public.bot_audit_logs
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- 3. Habilitar Realtime para estas tablas en Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bot_authorizations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bot_audit_logs;

-- 4. Semillas de prueba iniciales (Tasks)
INSERT INTO public.tasks (title, description, quadrant, category, phi_flag, due_date)
VALUES 
('Validar historial clínico paciente #8493', 'Revisión obligatoria de alergias a medicamentos antes de la intervención quirúrgica.', 'urgent_important', 'Clinica', true, timezone('utc'::text, now() + interval '4 hours')),
('Renovación de protocolos de privacidad HIPAA Q4', 'Actualización semestral de cifrado en reposo para bases de datos clínicas.', 'not_urgent_important', 'Administrativa', false, timezone('utc'::text, now() + interval '7 days')),
('Reunión de balance semanal con médicos de guardia', 'Coordinación de turnos y guardias del pabellón B.', 'urgent_not_important', 'Administrativa', false, timezone('utc'::text, now() + interval '1 day')),
('Lectura médica de actualización: Nuevos tratamientos oncológicos', 'Artículo de revisión médica New England Journal of Medicine.', 'not_urgent_important', 'Personal', false, timezone('utc'::text, now() + interval '14 days'))
ON CONFLICT DO NOTHING;

-- 5. Semillas de prueba para la cola HITL (Bot Authorizations de Dots y Musa)
INSERT INTO public.bot_authorizations (bot_name, action_type, requested_payload, phi_risk_detected, status)
VALUES
('Dots', 'create_task', '{"title": "Ingresar resultados de laboratorio Dra. Elena Rivas", "description": "Paciente #9921 con reporte hematológico y panel metabólico completo adjunto.", "quadrant": "urgent_important", "category": "Clinica", "phi_flag": true, "due_date": "2026-10-19T14:00:00Z"}'::jsonb, true, 'pending'),
('Musa', 'create_task', '{"title": "Programar mantenimiento preventivo Resonancia Magnética", "description": "Equipo Siemens Sala 3B requiere calibración mensual obligatoria.", "quadrant": "not_urgent_important", "category": "Administrativa", "phi_flag": false, "due_date": "2026-10-22T09:00:00Z"}'::jsonb, false, 'pending')
ON CONFLICT DO NOTHING;
