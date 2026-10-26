-- ========================================================================
-- REPARACIÓN DEFINITIVA DEL TIPO DE CATEGORÍA EN SUPABASE
-- Convierte la columna 'category' a TEXT libre para aceptar 'Business (BH)', 'Clinical', etc.
-- ========================================================================

-- 1. Convertir la columna category de enum estricto a TEXT
ALTER TABLE public.tasks 
ALTER COLUMN category TYPE TEXT USING category::text;

-- 2. Asegurar el valor por defecto
ALTER TABLE public.tasks 
ALTER COLUMN category SET DEFAULT 'Business (BH)';

-- 3. Notificar a PostgREST para recargar el esquema
NOTIFY pgrst, 'reload schema';

-- 4. Confirmar tipo de columna
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'category';
