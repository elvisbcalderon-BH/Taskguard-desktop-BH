-- ========================================================================
-- TaskGuard Desktop: Agregar control granular de acceso de bots (bot_access)
-- ========================================================================

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS bot_access BOOLEAN NOT NULL DEFAULT false;

-- Si la tarea contiene PHI médica, forzar por defecto bot_access = false
UPDATE public.tasks 
SET bot_access = false 
WHERE phi_flag = true;

-- Si no contiene PHI, podemos permitir por defecto o dejar a criterio del usuario
UPDATE public.tasks 
SET bot_access = true 
WHERE phi_flag = false AND category = 'Administrativa';
