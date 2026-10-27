-- ========================================================================
-- AGREGAR SOPORTE DE COMENTARIOS / NOTAS DE SEGUIMIENTO EN TASKS
-- ========================================================================

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;

-- Notificar recarga de esquema a PostgREST
NOTIFY pgrst, 'reload schema';
