-- ========================================================================
-- PERMISOS PÚBLICOS TEMPORALES PARA DIAGNÓSTICO EN TASKGUARD DESKTOP
-- Ejecuta esto en Supabase SQL Editor
-- ========================================================================

-- Desactivar temporalmente RLS en profiles para permitir lectura sin token JWT
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Asegurar que los perfiles tengan los correos exactos
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

-- Verificar que se devuelvan los usuarios
SELECT id, email, full_name, role, status FROM public.profiles;
