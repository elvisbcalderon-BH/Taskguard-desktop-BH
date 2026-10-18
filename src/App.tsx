import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Bot, 
  Clock, 
  Lock, 
  Layers, 
  Activity, 
  Plus, 
  Filter,
  CheckCircle2,
  Trash2,
  Edit2,
  Wifi,
  Radio
} from 'lucide-react';
import { supabase } from './lib/supabase';
import type { Task, BotAuthorization, BotAuditLog, EisenhowerQuadrant, TaskCategory } from './types/database';
import { TaskModal } from './components/TaskModal';
import { BotHitlDrawer } from './components/BotHitlDrawer';

export function App() {
  const [activeTab, setActiveTab] = useState<'matrix' | 'audit'>('matrix');
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | 'Todas'>('Todas');
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [authorizations, setAuthorizations] = useState<BotAuthorization[]>([]);
  const [auditLogs, setAuditLogs] = useState<BotAuditLog[]>([]);

  // Estados modales y cajón HITL
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isHitlDrawerOpen, setIsHitlDrawerOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // 1. CARGA INICIAL Y SUSCRIPCIÓN REALTIME CON SUPABASE
  useEffect(() => {
    fetchInitialData();

    // Suscripción Realtime a tasks
    const tasksChannel = supabase
      .channel('public:tasks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as Task;
            setTasks((prev) => [newTask, ...prev.filter((t) => t.id !== newTask.id)]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Task;
            setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          } else if (payload.eventType === 'DELETE') {
            const oldId = payload.old.id;
            setTasks((prev) => prev.filter((t) => t.id !== oldId));
          }
        }
      )
      .subscribe();

    // Suscripción Realtime a bot_authorizations
    const hitlChannel = supabase
      .channel('public:bot_authorizations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bot_authorizations' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newAuth = payload.new as BotAuthorization;
            if (newAuth.status === 'pending') {
              setAuthorizations((prev) => [newAuth, ...prev.filter((a) => a.id !== newAuth.id)]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedAuth = payload.new as BotAuthorization;
            if (updatedAuth.status !== 'pending') {
              setAuthorizations((prev) => prev.filter((a) => a.id !== updatedAuth.id));
            } else {
              setAuthorizations((prev) =>
                prev.map((a) => (a.id === updatedAuth.id ? updatedAuth : a))
              );
            }
          } else if (payload.eventType === 'DELETE') {
            setAuthorizations((prev) => prev.filter((a) => a.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(hitlChannel);
    };
  }, []);

  const fetchInitialData = async () => {
    try {
      // Cargar tareas
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (tasksError) {
        console.warn('Cargando respaldo local de tareas:', tasksError.message);
      } else if (tasksData) {
        setTasks(tasksData as Task[]);
      }

      // Cargar solicitudes pendientes de bots
      const { data: authData, error: authError } = await supabase
        .from('bot_authorizations')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (authError) {
        console.warn('Cargando respaldo de autorizaciones:', authError.message);
      } else if (authData) {
        setAuthorizations(authData as BotAuthorization[]);
      }

      // Cargar registros de auditoría
      const { data: logsData, error: logsError } = await supabase
        .from('bot_audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (logsError) {
        console.warn('Cargando auditoría:', logsError.message);
      } else if (logsData) {
        setAuditLogs(logsData as BotAuditLog[]);
      }
    } catch (err) {
      console.error('Error fetching Supabase data:', err);
    }
  };

  // 2. CREAR O EDITAR TAREA
  const handleSaveTask = async (taskData: Partial<Task>) => {
    try {
      if (editingTask) {
        // Actualizar
        const { data, error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', editingTask.id)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setTasks((prev) => prev.map((t) => (t.id === data.id ? (data as Task) : t)));
        }
      } else {
        // Crear
        const { data, error } = await supabase
          .from('tasks')
          .insert([taskData])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setTasks((prev) => [data as Task, ...prev]);
        }
      }
      setEditingTask(null);
    } catch (err) {
      console.error('Error guardando tarea en Supabase:', err);
    }
  };

  // 3. ELIMINAR TAREA
  const handleDeleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Error eliminando tarea:', err);
    }
  };

  // 4. CAMBIAR ESTADO RÁPIDO DE TAREA (TOGGLE COMPLETADA)
  const handleToggleTaskStatus = async (task: Task) => {
    const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status: nextStatus })
        .eq('id', task.id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setTasks((prev) => prev.map((t) => (t.id === data.id ? (data as Task) : t)));
      }
    } catch (err) {
      console.error('Error actualizando estado de tarea:', err);
    }
  };

  // 5. RESOLVER AUTORIZACIÓN HITL (Dots / Musa)
  const handleResolveAuth = async (id: string, approve: boolean, rejectionReason?: string) => {
    const target = authorizations.find((a) => a.id === id);
    if (!target) return;

    setActionLoadingId(id);
    try {
      let createdTaskId: string | null = null;

      if (approve) {
        // 1. Insertar tarea en la tabla tasks
        const { data: createdTask, error: taskErr } = await supabase
          .from('tasks')
          .insert([
            {
              title: target.requested_payload.title || 'Nueva actividad por bot',
              description: target.requested_payload.description || '',
              quadrant: target.requested_payload.quadrant || 'urgent_important',
              category: target.requested_payload.category || 'Clinica',
              phi_flag: !!target.requested_payload.phi_flag,
              due_date: target.requested_payload.due_date || null,
              created_by_bot: target.bot_name,
            },
          ])
          .select()
          .single();

        if (taskErr) throw taskErr;
        if (createdTask) {
          createdTaskId = createdTask.id;
          setTasks((prev) => [createdTask as Task, ...prev]);
        }
      }

      // 2. Actualizar estado en bot_authorizations
      const { error: authErr } = await supabase
        .from('bot_authorizations')
        .update({
          status: approve ? 'approved' : 'rejected',
          reviewed_at: new Date().toISOString(),
          target_task_id: createdTaskId,
          rejection_reason: rejectionReason || null,
        })
        .eq('id', id);

      if (authErr) throw authErr;

      // 3. Registrar en bitácora inmutable de auditoría (bot_audit_logs)
      const auditPayload: Partial<BotAuditLog> = {
        bot_name: target.bot_name,
        action_type: approve ? `${target.action_type}_APPROVED` : `${target.action_type}_REJECTED`,
        authorization_id: target.id,
        task_id: createdTaskId,
        accessed_phi: target.phi_risk_detected,
        ip_address: '127.0.0.1 (Desktop Operator)',
        user_agent: 'TaskGuard-HITL/1.0',
        event_details: {
          decision: approve ? 'APPROVED' : 'REJECTED',
          reason: rejectionReason || null,
          payload: target.requested_payload,
        },
        timestamp: new Date().toISOString(),
      };

      const { data: logData } = await supabase
        .from('bot_audit_logs')
        .insert([auditPayload])
        .select()
        .single();

      if (logData) {
        setAuditLogs((prev) => [logData as BotAuditLog, ...prev]);
      }

      // Remover de la cola pendiente en el estado local
      setAuthorizations((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Error resolviendo autorización HITL:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtrado de cuadrante + categoría
  const getQuadrantTasks = (quadrant: EisenhowerQuadrant) => {
    return tasks.filter((t) => {
      const matchQuadrant = t.quadrant === quadrant;
      const matchCategory =
        selectedCategory === 'Todas' ? true : t.category === selectedCategory;
      return matchQuadrant && matchCategory;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* HEADER DE SEGURIDAD */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(10px)',
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              padding: '10px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: '#fff',
              display: 'flex',
            }}
          >
            <Lock size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.3px' }}>
                TaskGuard Desktop
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '20px',
                  backgroundColor: 'var(--color-phi-bg)',
                  color: 'var(--color-phi)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  textTransform: 'uppercase',
                }}
              >
                HIPAA & PHI Standard
              </span>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  color: '#10b981',
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '2px 7px',
                  borderRadius: '12px',
                  fontWeight: 600,
                }}
              >
                <Radio size={12} className="pulse-icon" /> Realtime Sync
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Priorizador Eisenhower Clínico con Protección Activa Human-in-the-Loop
            </p>
          </div>
        </div>

        {/* CONTROLES Y NAVEGACIÓN */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setActiveTab('matrix')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: activeTab === 'matrix' ? '#fff' : 'var(--text-muted)',
              background: activeTab === 'matrix' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              border: activeTab === 'matrix' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
            }}
          >
            <Layers size={16} /> Matriz Eisenhower
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: activeTab === 'audit' ? '#fff' : 'var(--text-muted)',
              background: activeTab === 'audit' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              border: activeTab === 'audit' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
            }}
          >
            <Activity size={16} /> Auditoría ({auditLogs.length})
          </button>

          {/* BOTÓN CAJÓN HITL BOT CON ALERTA */}
          <button
            onClick={() => setIsHitlDrawerOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#fff',
              background:
                authorizations.length > 0
                  ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'
                  : 'rgba(139, 92, 246, 0.2)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              boxShadow: authorizations.length > 0 ? '0 0 16px rgba(139, 92, 246, 0.4)' : 'none',
            }}
          >
            <Bot size={16} /> Cola Bots (Dots / Musa)
            {authorizations.length > 0 && (
              <span
                style={{
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '1px 7px',
                  borderRadius: '10px',
                }}
              >
                {authorizations.length}
              </span>
            )}
          </button>

          {/* BOTÓN CREAR TAREA */}
          <button
            onClick={() => {
              setEditingTask(null);
              setIsTaskModalOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#fff',
              background: '#3b82f6',
              boxShadow: '0 2px 10px rgba(59, 130, 246, 0.3)',
            }}
          >
            <Plus size={16} /> Nueva Tarea
          </button>
        </div>
      </header>

      {/* BARRA DE FILTROS POR CATEGORÍA */}
      <div
        style={{
          padding: '10px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={15} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginRight: '6px' }}>
            FILTRAR POR CATEGORÍA:
          </span>

          {(['Todas', 'Clinica', 'Administrativa', 'Personal'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                fontSize: '12px',
                padding: '4px 12px',
                borderRadius: '6px',
                fontWeight: 600,
                color: selectedCategory === cat ? '#fff' : 'var(--text-dim)',
                background:
                  selectedCategory === cat ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                border:
                  selectedCategory === cat ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid transparent',
              }}
            >
              {cat === 'Clinica' ? 'Clínica' : cat}
            </button>
          ))}
        </div>

        <div style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Wifi size={14} style={{ color: '#10b981' }} />
          <span>Conectado a Supabase PostgreSQL ({tasks.length} tareas cargadas)</span>
        </div>
      </div>

      {/* ÁREA DE CONTENIDO */}
      <main style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
        {/* TAB 1: MATRIZ DE EISENHOWER */}
        {activeTab === 'matrix' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
              height: '100%',
              minHeight: '620px',
            }}
          >
            {/* Q1: URGENTE & IMPORTANTE */}
            <div
              className="glass-panel"
              style={{ padding: '16px', display: 'flex', flexDirection: 'column', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-q1)', boxShadow: '0 0 10px rgba(239, 68, 68, 0.6)' }} />
                  <div>
                    <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#f87171' }}>Q1: CRÍTICO / CRISIS</h3>
                    <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Hacer de inmediato (Urgente e Importante)</p>
                  </div>
                </div>
                <span style={{ fontSize: '12px', color: '#f87171', fontWeight: 700, background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                  {getQuadrantTasks('urgent_important').length}
                </span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
                {getQuadrantTasks('urgent_important').map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onToggle={handleToggleTaskStatus}
                    onEdit={(task) => {
                      setEditingTask(task);
                      setIsTaskModalOpen(true);
                    }}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </div>
            </div>

            {/* Q2: NO URGENTE & IMPORTANTE */}
            <div
              className="glass-panel"
              style={{ padding: '16px', display: 'flex', flexDirection: 'column', borderColor: 'rgba(59, 130, 246, 0.3)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-q2)', boxShadow: '0 0 10px rgba(59, 130, 246, 0.6)' }} />
                  <div>
                    <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#60a5fa' }}>Q2: ESTRATÉGICO</h3>
                    <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Planificar / Agendar (No Urgente pero Importante)</p>
                  </div>
                </div>
                <span style={{ fontSize: '12px', color: '#60a5fa', fontWeight: 700, background: 'rgba(59,130,246,0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                  {getQuadrantTasks('not_urgent_important').length}
                </span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
                {getQuadrantTasks('not_urgent_important').map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onToggle={handleToggleTaskStatus}
                    onEdit={(task) => {
                      setEditingTask(task);
                      setIsTaskModalOpen(true);
                    }}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </div>
            </div>

            {/* Q3: URGENTE & NO IMPORTANTE */}
            <div
              className="glass-panel"
              style={{ padding: '16px', display: 'flex', flexDirection: 'column', borderColor: 'rgba(245, 158, 11, 0.3)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-q3)', boxShadow: '0 0 10px rgba(245, 158, 11, 0.6)' }} />
                  <div>
                    <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#fbbf24' }}>Q3: DELEGAR</h3>
                    <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Interrupciones / Solicitudes Bots (Urgente pero No Importante)</p>
                  </div>
                </div>
                <span style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 700, background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                  {getQuadrantTasks('urgent_not_important').length}
                </span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
                {getQuadrantTasks('urgent_not_important').map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onToggle={handleToggleTaskStatus}
                    onEdit={(task) => {
                      setEditingTask(task);
                      setIsTaskModalOpen(true);
                    }}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </div>
            </div>

            {/* Q4: NO URGENTE & NO IMPORTANTE */}
            <div
              className="glass-panel"
              style={{ padding: '16px', display: 'flex', flexDirection: 'column', borderColor: 'rgba(16, 185, 129, 0.3)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-q4)', boxShadow: '0 0 10px rgba(16, 185, 129, 0.6)' }} />
                  <div>
                    <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#34d399' }}>Q4: DESCARTAR</h3>
                    <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Baja prioridad o tareas innecesarias</p>
                  </div>
                </div>
                <span style={{ fontSize: '12px', color: '#34d399', fontWeight: 700, background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                  {getQuadrantTasks('not_urgent_not_important').length}
                </span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
                {getQuadrantTasks('not_urgent_not_important').map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onToggle={handleToggleTaskStatus}
                    onEdit={(task) => {
                      setEditingTask(task);
                      setIsTaskModalOpen(true);
                    }}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AUDITORÍA MÉDICA */}
        {activeTab === 'audit' && (
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>
                Bitácora Inmutable de Auditoría HIPAA
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Trazabilidad completa de las aprobaciones humanas sobre solicitudes originadas por bots inteligentes.
              </p>
            </div>

            <div className="glass-panel" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>TIMESTAMP</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>BOT / AGENTE</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>ACCIÓN REGISTRADA</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>DATOS PHI</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>ORIGEN</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: log.bot_name === 'Dots' ? 'var(--accent-dots)' : 'var(--accent-musa)' }}>
                        {log.bot_name}
                      </td>
                      <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {log.action_type}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {log.accessed_phi ? (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--color-phi-bg)',
                              color: 'var(--color-phi)',
                              fontWeight: 800,
                              fontSize: '11px',
                            }}
                          >
                            PHI SENSIBLE
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>NO PHI</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        {log.ip_address}
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)' }}>
                        No hay registros de auditoría aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL CREAR / EDITAR TAREA */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        initialTask={editingTask}
      />

      {/* CAJÓN HITL BOT FLOTANTE */}
      <BotHitlDrawer
        isOpen={isHitlDrawerOpen}
        onClose={() => setIsHitlDrawerOpen(false)}
        authorizations={authorizations}
        onResolve={handleResolveAuth}
        loadingId={actionLoadingId}
      />
    </div>
  );
}

// TARJETA DE TAREA INDIVIDUAL
function TaskCard({
  task,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task;
  onToggle: (t: Task) => void;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
}) {
  const isCompleted = task.status === 'completed';

  return (
    <div
      style={{
        background: isCompleted ? 'rgba(255, 255, 255, 0.015)' : 'rgba(255, 255, 255, 0.035)',
        borderRadius: '10px',
        padding: '12px 14px',
        border: task.phi_flag
          ? '1px solid rgba(244, 63, 94, 0.3)'
          : '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        transition: 'all 0.2s ease',
        opacity: isCompleted ? 0.6 : 1,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1 }}>
          <button
            onClick={() => onToggle(task)}
            style={{
              background: 'transparent',
              color: isCompleted ? '#10b981' : 'var(--text-dim)',
              marginTop: '1px',
              padding: 0,
              display: 'flex',
            }}
          >
            <CheckCircle2 size={16} />
          </button>
          <div>
            <h4
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: isCompleted ? 'var(--text-muted)' : '#f8fafc',
                lineHeight: '1.4',
                textDecoration: isCompleted ? 'line-through' : 'none',
              }}
            >
              {task.title}
            </h4>
          </div>
        </div>

        {/* INDICADOR PHI DESTACADO */}
        {task.phi_flag && (
          <span
            style={{
              fontSize: '10px',
              padding: '2px 7px',
              borderRadius: '4px',
              backgroundColor: 'var(--color-phi-bg)',
              color: 'var(--color-phi)',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              letterSpacing: '0.3px',
            }}
          >
            <ShieldAlert size={12} /> PHI
          </span>
        )}
      </div>

      {task.description && (
        <p
          style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            lineHeight: '1.4',
            paddingLeft: '24px',
          }}
        >
          {task.description}
        </p>
      )}

      {/* PIE DE TARJETA: METADATOS Y ACCIONES */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '6px',
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.04)',
          fontSize: '11px',
          color: 'var(--text-dim)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {task.category && (
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '1px 6px',
                borderRadius: '4px',
                fontWeight: 600,
              }}
            >
              {task.category}
            </span>
          )}

          {task.created_by_bot ? (
            <span
              style={{
                color: task.created_by_bot === 'Dots' ? 'var(--accent-dots)' : 'var(--accent-musa)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <Bot size={11} /> {task.created_by_bot}
            </span>
          ) : (
            <span>Manual</span>
          )}

          {task.due_date && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={11} /> {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* BOTONES ACCIÓN EDITAR / ELIMINAR */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => onEdit(task)}
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              padding: '3px',
              borderRadius: '4px',
              display: 'flex',
            }}
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            style={{
              background: 'transparent',
              color: '#ef4444',
              padding: '3px',
              borderRadius: '4px',
              display: 'flex',
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
