-- ========================================================================
-- REPARACIÓN COMPLETA DE SINCRONIZACIÓN MULTI-PC PARA TASKGUARD
-- Ejecuta este script completo en el SQL Editor de Supabase
-- ========================================================================

-- 1. Agregar columnas requeridas por TaskGuard Desktop si no existen
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'Bill';

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2) DEFAULT 0;

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS recurring_monthly BOOLEAN DEFAULT false;

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS installments JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Business (BH)';

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS bot_access BOOLEAN DEFAULT true;

-- Permitir user_id opcional para inserciones directas
ALTER TABLE public.tasks 
ALTER COLUMN user_id DROP NOT NULL;

-- 2. POLÍTICA DE SINCRONIZACIÓN UNIVERSAL (Permite sincronizar entre PCs)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sync tasks across all users" ON public.tasks;
CREATE POLICY "Sync tasks across all users"
    ON public.tasks
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- 3. HABILITAR TIEMPO REAL (REALTIME) PARA LA TABLA TASKS
-- Esto permite que cuando una PC inserte una tarea, la otra PC la reciba en vivo
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

-- 4. Notificar a PostgREST que recargue el esquema de columnas inmediatamente
NOTIFY pgrst, 'reload schema';

-- 5. Comprobar que la tabla tasks esté lista
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks';
