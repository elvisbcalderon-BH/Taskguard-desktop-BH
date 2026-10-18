-- ========================================================================
-- TaskGuard Desktop: Database Architecture & Security Schema
-- Target: Supabase (PostgreSQL 15+)
-- Compliance: HIPAA / PHI Ready, Human-in-the-Loop Bot Authorization, Full Auditability
-- ========================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean existing definitions if recreating
DROP TABLE IF EXISTS public.bot_audit_logs CASCADE;
DROP TABLE IF EXISTS public.bot_authorizations CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TYPE IF EXISTS public.eisenhower_quadrant CASCADE;
DROP TYPE IF EXISTS public.task_status CASCADE;
DROP TYPE IF EXISTS public.auth_request_status CASCADE;
DROP TYPE IF EXISTS public.bot_action_type CASCADE;

-- 1. ENUMS
CREATE TYPE public.eisenhower_quadrant AS ENUM (
    'urgent_important',       -- Q1: Do First (Crítico / Crisis)
    'not_urgent_important',   -- Q2: Schedule / Plan (Estratégico / Salud a largo plazo)
    'urgent_not_important',   -- Q3: Delegate (Interrupciones / Solicitudes bots)
    'not_urgent_not_important'-- Q4: Eliminate (Descartar / Baja prioridad)
);

CREATE TYPE public.task_status AS ENUM (
    'todo',
    'in_progress',
    'completed',
    'archived'
);

CREATE TYPE public.auth_request_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'expired'
);

CREATE TYPE public.bot_action_type AS ENUM (
    'create_task',
    'update_task',
    'delete_task',
    'read_phi',
    'bulk_sync'
);

-- 2. TABLA: TASKS
-- Almacena las tareas priorizadas bajo la matriz de Eisenhower con soporte de HIPAA (phi_flag)
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) >= 1),
    description TEXT,
    quadrant public.eisenhower_quadrant NOT NULL DEFAULT 'urgent_important',
    status public.task_status NOT NULL DEFAULT 'todo',
    phi_flag BOOLEAN NOT NULL DEFAULT false, -- Indica si contiene Información de Salud Protegida (PHI/HIPAA)
    phi_encrypted_notes TEXT,                -- Campo preparado para payload cifrado o notas sensibles
    due_date TIMESTAMPTZ,
    created_by_bot TEXT,                     -- Identificador del bot de origen si aplica ('Dots', 'Musa', etc.)
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices de alto rendimiento para Tasks
CREATE INDEX idx_tasks_user_quadrant ON public.tasks (user_id, quadrant);
CREATE INDEX idx_tasks_user_phi ON public.tasks (user_id, phi_flag);
CREATE INDEX idx_tasks_status ON public.tasks (status);

-- 3. TABLA: BOT_AUTHORIZATIONS (Human-in-the-Loop)
-- Cola de solicitudes donde bots externos (Dots, Musa) proponen acciones sin acceso directo a BD
CREATE TABLE public.bot_authorizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bot_name TEXT NOT NULL CHECK (bot_name IN ('Dots', 'Musa', 'ExternalBot')),
    action_type public.bot_action_type NOT NULL,
    target_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    requested_payload JSONB NOT NULL,       -- Datos completos propuestos por el bot para revisión
    phi_risk_detected BOOLEAN NOT NULL DEFAULT false,
    status public.auth_request_status NOT NULL DEFAULT 'pending',
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices para la cola de aprobación visual
CREATE INDEX idx_bot_auth_user_status ON public.bot_authorizations (user_id, status);
CREATE INDEX idx_bot_auth_created ON public.bot_authorizations (created_at DESC);

-- 4. TABLA: BOT_AUDIT_LOGS
-- Bitácora inmutable de auditoría para trazabilidad de seguridad y cumplimiento HIPAA
CREATE TABLE public.bot_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bot_name TEXT NOT NULL,
    action_type TEXT NOT NULL,
    authorization_id UUID REFERENCES public.bot_authorizations(id) ON DELETE SET NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    accessed_phi BOOLEAN NOT NULL DEFAULT false,
    ip_address TEXT,
    user_agent TEXT,
    event_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices de auditoría médica
CREATE INDEX idx_audit_user_timestamp ON public.bot_audit_logs (user_id, timestamp DESC);
CREATE INDEX idx_audit_phi_accessed ON public.bot_audit_logs (accessed_phi) WHERE accessed_phi = true;

-- 5. TRIGGER PARA ACTUALIZAR updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 6. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de Tasks: El usuario autenticado solo ve y manipula sus propias tareas
CREATE POLICY "Users can manage own tasks"
    ON public.tasks
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Políticas de Bot Authorizations: El usuario solo gestiona autorizaciones dirigidas a él
CREATE POLICY "Users can view and respond to their bot requests"
    ON public.bot_authorizations
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Políticas de Audit Logs: Solo lectura para el usuario sobre sus propios registros (Inmutabilidad)
CREATE POLICY "Users can view own audit logs"
    ON public.bot_audit_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Service roles can insert audit logs"
    ON public.bot_audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 7. PROCEDIMIENTO ALMACENADO PARA APROBACIÓN CON REGLA HITL (Human-in-the-Loop)
-- Procesa la autorización aprobada y genera el log de auditoría automáticamente
CREATE OR REPLACE FUNCTION public.resolve_bot_authorization(
    p_authorization_id UUID,
    p_approve BOOLEAN,
    p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_auth public.bot_authorizations%ROWTYPE;
    v_new_task_id UUID;
    v_result JSONB;
BEGIN
    -- Validar existencia y propiedad de la solicitud
    SELECT * INTO v_auth
    FROM public.bot_authorizations
    WHERE id = p_authorization_id AND user_id = auth.uid() AND status = 'pending'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Solicitud no encontrada o ya procesada.';
    END IF;

    IF p_approve THEN
        -- Ejecutar la acción aprobada según el tipo
        IF v_auth.action_type = 'create_task' THEN
            INSERT INTO public.tasks (
                user_id,
                title,
                description,
                quadrant,
                phi_flag,
                due_date,
                created_by_bot
            ) VALUES (
                v_auth.user_id,
                (v_auth.requested_payload->>'title')::TEXT,
                (v_auth.requested_payload->>'description')::TEXT,
                COALESCE((v_auth.requested_payload->>'quadrant')::public.eisenhower_quadrant, 'urgent_important'),
                COALESCE((v_auth.requested_payload->>'phi_flag')::BOOLEAN, false),
                (v_auth.requested_payload->>'due_date')::TIMESTAMPTZ,
                v_auth.bot_name
            ) RETURNING id INTO v_new_task_id;
        END IF;

        -- Marcar como aprobada
        UPDATE public.bot_authorizations
        SET status = 'approved',
            reviewed_at = timezone('utc'::text, now()),
            reviewed_by = auth.uid(),
            target_task_id = COALESCE(target_task_id, v_new_task_id)
        WHERE id = v_auth.id;

        -- Registrar en bitácora de auditoría
        INSERT INTO public.bot_audit_logs (
            user_id,
            bot_name,
            action_type,
            authorization_id,
            task_id,
            accessed_phi,
            event_details
        ) VALUES (
            v_auth.user_id,
            v_auth.bot_name,
            v_auth.action_type::TEXT || '_APPROVED',
            v_auth.id,
            COALESCE(v_auth.target_task_id, v_new_task_id),
            v_auth.phi_risk_detected,
            jsonb_build_object('payload', v_auth.requested_payload, 'approved_by', auth.uid())
        );

        v_result := jsonb_build_object('success', true, 'status', 'approved', 'task_id', v_new_task_id);
    ELSE
        -- Marcar como rechazada
        UPDATE public.bot_authorizations
        SET status = 'rejected',
            reviewed_at = timezone('utc'::text, now()),
            reviewed_by = auth.uid(),
            rejection_reason = p_rejection_reason
        WHERE id = v_auth.id;

        -- Registrar en bitácora de auditoría
        INSERT INTO public.bot_audit_logs (
            user_id,
            bot_name,
            action_type,
            authorization_id,
            task_id,
            accessed_phi,
            event_details
        ) VALUES (
            v_auth.user_id,
            v_auth.bot_name,
            v_auth.action_type::TEXT || '_REJECTED',
            v_auth.id,
            v_auth.target_task_id,
            v_auth.phi_risk_detected,
            jsonb_build_object('rejection_reason', p_rejection_reason)
        );

        v_result := jsonb_build_object('success', true, 'status', 'rejected');
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
