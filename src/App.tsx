import { useState } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Bot, 
  Clock, 
  Lock, 
  Layers, 
  Activity
} from 'lucide-react';
import type { Task, BotAuthorization, BotAuditLog, EisenhowerQuadrant } from './types/database';

export function App() {
  const [activeTab, setActiveTab] = useState<'matrix' | 'hitl' | 'audit'>('matrix');

  // Muestra de datos representativa inicial para verificar el funcionamiento
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      user_id: 'usr_001',
      title: 'Validar historial clínico paciente #8493',
      description: 'Revisión obligatoria de alergias a medicamentos antes de la intervención quirúrgica.',
      quadrant: 'urgent_important',
      status: 'todo',
      phi_flag: true,
      due_date: '2026-10-18T18:00:00Z',
      created_by_bot: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      user_id: 'usr_001',
      title: 'Renovación de protocolos de privacidad HIPAA Q4',
      description: 'Actualización semestral de cifrado en reposo para bases de datos clínicas.',
      quadrant: 'not_urgent_important',
      status: 'in_progress',
      phi_flag: false,
      due_date: '2026-11-01T12:00:00Z',
      created_by_bot: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '3',
      user_id: 'usr_001',
      title: 'Clasificar emails automáticos de proveedores de insumos',
      description: 'Sincronización de facturación médica sin datos de pacientes.',
      quadrant: 'urgent_not_important',
      status: 'todo',
      phi_flag: false,
      due_date: '2026-10-19T10:00:00Z',
      created_by_bot: 'Dots',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);

  const [authorizations, setAuthorizations] = useState<BotAuthorization[]>([
    {
      id: 'auth_1',
      user_id: 'usr_001',
      bot_name: 'Dots',
      action_type: 'create_task',
      target_task_id: null,
      requested_payload: {
        title: 'Ingresar resultados de laboratorio Dra. Elena Rivas',
        description: 'Paciente con reporte hematológico y panel metabólico completo adjunto.',
        quadrant: 'urgent_important',
        phi_flag: true,
      },
      phi_risk_detected: true,
      status: 'pending',
      reviewed_at: null,
      reviewed_by: null,
      rejection_reason: null,
      created_at: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    },
    {
      id: 'auth_2',
      user_id: 'usr_001',
      bot_name: 'Musa',
      action_type: 'create_task',
      target_task_id: null,
      requested_payload: {
        title: 'Programar recordatorio de calibración de resonancia magnética',
        description: 'Mantenimiento preventivo equipo Siemens Sala 3B.',
        quadrant: 'not_urgent_important',
        phi_flag: false,
      },
      phi_risk_detected: false,
      status: 'pending',
      reviewed_at: null,
      reviewed_by: null,
      rejection_reason: null,
      created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
  ]);

  const [auditLogs, setAuditLogs] = useState<BotAuditLog[]>([
    {
      id: 'log_1',
      user_id: 'usr_001',
      bot_name: 'Dots',
      action_type: 'AUTH_PROPOSAL_GENERATED',
      authorization_id: 'auth_1',
      task_id: null,
      accessed_phi: true,
      ip_address: '127.0.0.1 (Internal Agent)',
      user_agent: 'TaskGuard-Core-Daemon/v1.0',
      event_details: { risk_level: 'HIGH_PHI', fields_scanned: ['patient_id', 'lab_results'] },
      timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    },
  ]);

  // Manejador HITL (Human-in-the-Loop)
  const handleResolveAuth = (id: string, approve: boolean) => {
    const target = authorizations.find((a) => a.id === id);
    if (!target) return;

    if (approve) {
      // Inyectar en tareas aprobadas
      const newTask: Task = {
        id: `task_${Date.now()}`,
        user_id: target.user_id,
        title: target.requested_payload.title || 'Nueva tarea creada por bot',
        description: target.requested_payload.description || '',
        quadrant: target.requested_payload.quadrant || 'urgent_important',
        status: 'todo',
        phi_flag: !!target.requested_payload.phi_flag,
        due_date: target.requested_payload.due_date || null,
        created_by_bot: target.bot_name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setTasks((prev) => [newTask, ...prev]);
    }

    // Registrar en auditoría médica
    const newLog: BotAuditLog = {
      id: `log_${Date.now()}`,
      user_id: target.user_id,
      bot_name: target.bot_name,
      action_type: approve ? `${target.action_type}_APPROVED` : `${target.action_type}_REJECTED`,
      authorization_id: target.id,
      task_id: null,
      accessed_phi: target.phi_risk_detected,
      ip_address: '127.0.0.1 (Local HITL UI)',
      user_agent: 'TaskGuard-Desktop-Client/0.1.0',
      event_details: {
        resolution: approve ? 'APPROVED_BY_OPERATOR' : 'REJECTED_BY_OPERATOR',
        payload: target.requested_payload,
      },
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);

    // Actualizar cola
    setAuthorizations((prev) => prev.filter((a) => a.id !== id));
  };

  const getQuadrantTasks = (quadrant: EisenhowerQuadrant) => {
    return tasks.filter((t) => t.quadrant === quadrant);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* HEADER DE SEGURIDAD */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.95)',
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
              <h1 style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.3px' }}>
                TaskGuard Desktop
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '20px',
                  backgroundColor: 'var(--color-phi-bg)',
                  color: 'var(--color-phi)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                HIPAA & PHI Standard
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Matriz Eisenhower con Cola de Autorización Segura Human-in-the-Loop
            </p>
          </div>
        </div>

        {/* NAVEGACIÓN */}
        <div style={{ display: 'flex', gap: '8px' }}>
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
            onClick={() => setActiveTab('hitl')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              position: 'relative',
              color: activeTab === 'hitl' ? '#fff' : 'var(--text-muted)',
              background: activeTab === 'hitl' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
              border: activeTab === 'hitl' ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid transparent',
            }}
          >
            <Bot size={16} /> Cola HITL (Bots)
            {authorizations.length > 0 && (
              <span
                style={{
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '10px',
                }}
              >
                {authorizations.length}
              </span>
            )}
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
            <Activity size={16} /> Auditoría & Logs
          </button>
        </div>
      </header>

      {/* CONTENEDOR PRINCIPAL */}
      <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        {/* VISTA 1: MATRIZ DE EISENHOWER */}
        {activeTab === 'matrix' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
              height: '100%',
              minHeight: '600px',
            }}
          >
            {/* Q1: URGENTE & IMPORTANTE */}
            <div
              className="glass-panel"
              style={{ padding: '16px', display: 'flex', flexDirection: 'column', borderColor: 'rgba(239, 68, 68, 0.25)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-q1)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#f87171' }}>Q1: CRÍTICO (Hacer de inmediato)</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>
                  {getQuadrantTasks('urgent_important').length} tareas
                </span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {getQuadrantTasks('urgent_important').map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            </div>

            {/* Q2: NO URGENTE & IMPORTANTE */}
            <div
              className="glass-panel"
              style={{ padding: '16px', display: 'flex', flexDirection: 'column', borderColor: 'rgba(59, 130, 246, 0.25)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-q2)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#60a5fa' }}>Q2: ESTRATÉGICO (Planificar / Agendar)</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>
                  {getQuadrantTasks('not_urgent_important').length} tareas
                </span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {getQuadrantTasks('not_urgent_important').map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            </div>

            {/* Q3: URGENTE & NO IMPORTANTE */}
            <div
              className="glass-panel"
              style={{ padding: '16px', display: 'flex', flexDirection: 'column', borderColor: 'rgba(245, 158, 11, 0.25)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-q3)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#fbbf24' }}>Q3: DELEGAR (Interrupciones / Solicitudes Bots)</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>
                  {getQuadrantTasks('urgent_not_important').length} tareas
                </span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {getQuadrantTasks('urgent_not_important').map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            </div>

            {/* Q4: NO URGENTE & NO IMPORTANTE */}
            <div
              className="glass-panel"
              style={{ padding: '16px', display: 'flex', flexDirection: 'column', borderColor: 'rgba(16, 185, 129, 0.25)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-q4)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#34d399' }}>Q4: DESCARTAR (Baja prioridad)</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>
                  {getQuadrantTasks('not_urgent_not_important').length} tareas
                </span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {getQuadrantTasks('not_urgent_not_important').map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
                {getQuadrantTasks('not_urgent_not_important').length === 0 && (
                  <div style={{ color: 'var(--text-dim)', fontSize: '13px', textAlign: 'center', marginTop: '30px' }}>
                    Sin tareas en este cuadrante
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VISTA 2: COLA DE AUTORIZACIÓN HITL */}
        {activeTab === 'hitl' && (
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>
                Cola de Aprobación Human-in-the-Loop
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Los agentes inteligentes (Dots y Musa) no tienen privilegios de escritura directa sobre la base de datos de pacientes. Cada acción requiere autorización manual explícita.
              </p>
            </div>

            {authorizations.length === 0 ? (
              <div
                className="glass-panel"
                style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}
              >
                <CheckCircle2 size={40} style={{ color: '#10b981', marginBottom: '12px' }} />
                <h3>No hay solicitudes pendientes</h3>
                <p style={{ fontSize: '13px', marginTop: '6px' }}>Todos los eventos de bots han sido procesados.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {authorizations.map((auth) => (
                  <div
                    key={auth.id}
                    className="glass-panel"
                    style={{
                      padding: '20px',
                      borderLeft: auth.phi_risk_detected
                        ? '4px solid var(--color-phi)'
                        : '4px solid #3b82f6',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            backgroundColor: auth.bot_name === 'Dots' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(6, 182, 212, 0.2)',
                            color: auth.bot_name === 'Dots' ? 'var(--accent-dots)' : 'var(--accent-musa)',
                            border: '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          BOT: {auth.bot_name}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                          Acción: {auth.action_type}
                        </span>
                      </div>

                      {auth.phi_risk_detected && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--color-phi-bg)',
                            color: 'var(--color-phi)',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          <ShieldAlert size={14} /> ALERTA DE PHI DETECTADA
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '14px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 600 }}>{auth.requested_payload.title}</h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {auth.requested_payload.description}
                      </p>
                    </div>

                    {/* METADATOS Y ACCIONES */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '18px',
                        paddingTop: '14px',
                        borderTop: '1px solid var(--border-subtle)',
                      }}
                    >
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                        Cuadrante sugerido: <strong>{auth.requested_payload.quadrant}</strong>
                      </span>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => handleResolveAuth(auth.id, false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                          }}
                        >
                          <XCircle size={15} /> Rechazar
                        </button>

                        <button
                          onClick={() => handleResolveAuth(auth.id, true)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: '#3b82f6',
                            color: '#fff',
                          }}
                        >
                          <CheckCircle2 size={15} /> Aprobar e Insertar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VISTA 3: AUDITORÍA Y TRAZABILIDAD */}
        {activeTab === 'audit' && (
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>
                Bitácora Inmutable de Auditoría (Cumplimiento HIPAA)
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Registro estricto de eventos de lectura, manipulación y resoluciones humanas sobre actividades médicas.
              </p>
            </div>

            <div className="glass-panel" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>TIMESTAMP</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>BOT / AGENTE</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>ACCIÓN REGISTRADA</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>PHI ACCESS</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>IP ORIGEN</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>{log.bot_name}</td>
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
                              fontWeight: 700,
                              fontSize: '11px',
                            }}
                          >
                            PHI PRESENTE
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
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '8px',
        padding: '12px 14px',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', lineHeight: '1.4' }}>
          {task.title}
        </h4>
        {task.phi_flag && (
          <span
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'var(--color-phi-bg)',
              color: 'var(--color-phi)',
              fontWeight: 800,
              whiteSpace: 'nowrap',
              marginLeft: '8px',
            }}
          >
            PHI
          </span>
        )}
      </div>

      {task.description && (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          {task.description}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--text-dim)' }}>
        {task.created_by_bot ? (
          <span style={{ color: '#8b5cf6', fontWeight: 600 }}>Bot: {task.created_by_bot}</span>
        ) : (
          <span>Manual</span>
        )}
        {task.due_date && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} /> {new Date(task.due_date).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}

export default App;
