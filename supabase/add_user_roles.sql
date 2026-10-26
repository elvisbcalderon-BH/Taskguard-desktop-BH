-- ========================================================================
-- TaskGuard Desktop: Roles & Multi-User Architecture (Profiles & RLS)
-- Permite control total al Administrador y colaboración a miembros/editores
-- ========================================================================

-- 1. CREAR TABLA DE PERFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS DE RLS PARA PROFILES
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Administradores pueden ver todos los perfiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Administradores pueden actualizar perfiles (roles, status)
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Administradores pueden insertar perfiles
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
        OR auth.uid() = id
    );

-- 3. TRIGGER AUTOMÁTICO: Crear perfil al registrarse en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    is_first_user BOOLEAN;
BEGIN
    -- Si es el primer usuario del sistema, otorgar rol 'admin' automáticamente
    SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO is_first_user;

    INSERT INTO public.profiles (id, email, full_name, role, status)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        CASE 
            WHEN is_first_user THEN 'admin'
            WHEN NEW.raw_user_meta_data->>'role' = 'admin' THEN 'admin'
            ELSE 'member'
        END,
        'active'
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sincronizar usuarios existentes en auth.users a profiles (si ya existen)
INSERT INTO public.profiles (id, email, full_name, role, status)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
    'admin', -- Los usuarios actuales se configuran como admin
    'active'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 4. POLÍTICAS DE ACCESO COMPARTIDO PARA TAREAS Y FACTURAS (MULTIUSUARIO)
-- Todos los usuarios activos de la empresa pueden ver las tareas y facturas compartidas
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active users can view shared tasks" ON public.tasks;
CREATE POLICY "Active users can view shared tasks"
    ON public.tasks
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Active users can insert tasks" ON public.tasks;
CREATE POLICY "Active users can insert tasks"
    ON public.tasks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Active users can update tasks" ON public.tasks;
CREATE POLICY "Active users can update tasks"
    ON public.tasks
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Admins can delete tasks" ON public.tasks;
CREATE POLICY "Admins can delete tasks"
    ON public.tasks
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.status = 'active'
        )
    );
