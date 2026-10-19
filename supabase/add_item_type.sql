-- ========================================================================
-- TaskGuard Desktop: Agregar columna 'type' ('Task' vs 'Bill')
-- ========================================================================

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'Bill';

-- Actualizar tareas clínicas existentes sin monto como 'Task'
UPDATE public.tasks 
SET type = 'Task' 
WHERE amount = 0 OR category = 'Clinica' OR category = 'Clinical';
