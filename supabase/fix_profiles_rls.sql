-- ========================================================================
-- REPARACIÓN INMEDIATA DE PERFILES Y RECURSIÓN RLS EN SUPABASE
-- Ejecuta este script completo en el SQL Editor de Supabase
-- ========================================================================

-- 1. Eliminar políticas con recursión infinita
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;

-- 2. Función segura SECURITY DEFINER para verificar rol admin sin recursión
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Políticas limpias y directas para PROFILES
CREATE POLICY "Allow authenticated read profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow admins to update profiles"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (public.is_admin() OR auth.uid() = id);

CREATE POLICY "Allow insert profiles"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 4. INSERTAR/SINCRONIZAR AHORA MISMO TODOS LOS USUARIOS DE AUTH.USERS
INSERT INTO public.profiles (id, email, full_name, role, status)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
    'admin',
    'active'
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET 
    role = 'admin',
    status = 'active',
    updated_at = NOW();

-- 5. VERIFICACIÓN FINAL: Devolver los perfiles sincronizados
SELECT id, email, full_name, role, status FROM public.profiles;
