import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

// Tipos de datos para TypeScript
export interface Task {
  id: string;
  title: string;
  description: string;
  category: 'Clinica' | 'Administrativa' | 'Personal';
  priority: 'Alta' | 'Media' | 'Baja';
  status: 'Pendiente' | 'En Progreso' | 'Completada';
  phi_flag: boolean;
}

export interface BotAuthRequest {
  id: string;
  bot_name: 'Dots' | 'Musa' | string;
  requested_action: string;
  payload: { title: string; category: string; priority: string; description?: string };
  status: 'Pendiente' | 'Aprobado' | 'Rechazado';
}

export default function TaskGuardDashboard() {
  // Estados principales conectados con datos de Supabase + fallback
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Revisión de resultados de laboratorio - Paciente A',
      description: 'Verificar valores fuera de rango y ajustar medicación.',
      category: 'Clinica',
      priority: 'Alta',
      status: 'Pendiente',
      phi_flag: true, // Contiene PHI / HIPAA
    },
    {
      id: '2',
      title: 'Actualizar protocolo de inventario',
      description: 'Revisar insumos médicos disponibles para la semana.',
      category: 'Administrativa',
      priority: 'Media',
      status: 'Pendiente',
      phi_flag: false,
    },
  ]);

  const [botRequests, setBotRequests] = useState<BotAuthRequest[]>([
    {
      id: 'req-1',
      bot_name: 'Musa',
      requested_action: 'INSERT_TASK',
      payload: { title: 'Seguimiento clínico post-operatorio', category: 'Clinica', priority: 'Alta' },
      status: 'Pendiente',
    },
  ]);

  const [activeTab, setActiveTab] = useState<'Todas' | 'Clinica' | 'Administrativa' | 'Personal'>('Todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<'Clinica' | 'Administrativa' | 'Personal'>('Clinica');
  const [newPriority, setNewPriority] = useState<'Alta' | 'Media' | 'Baja'>('Alta');
  const [newPhiFlag, setNewPhiFlag] = useState(false);

  // Sincronización Realtime con Supabase
  useEffect(() => {
    fetchFromSupabase();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => fetchFromSupabase()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bot_authorizations' },
        () => fetchFromSupabase()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchFromSupabase = async () => {
    try {
      const { data: dbTasks } = await supabase.from('tasks').select('*');
      if (dbTasks && dbTasks.length > 0) {
        setTasks(
          dbTasks.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description || '',
            category: (t.category as Task['category']) || 'Clinica',
            priority: (t.quadrant === 'urgent_important' ? 'Alta' : t.quadrant === 'not_urgent_important' ? 'Media' : 'Baja'),
            status: t.status === 'completed' ? 'Completada' : t.status === 'in_progress' ? 'En Progreso' : 'Pendiente',
            phi_flag: !!t.phi_flag,
          }))
        );
      }

      const { data: dbAuths } = await supabase.from('bot_authorizations').select('*').eq('status', 'pending');
      if (dbAuths && dbAuths.length > 0) {
        setBotRequests(
          dbAuths.map((a) => ({
            id: a.id,
            bot_name: a.bot_name as 'Dots' | 'Musa',
            requested_action: a.action_type || 'INSERT_TASK',
            payload: {
              title: a.requested_payload?.title || 'Sin título',
              category: a.requested_payload?.category || 'Clinica',
              priority: a.requested_payload?.quadrant === 'urgent_important' ? 'Alta' : 'Media',
              description: a.requested_payload?.description || '',
            },
            status: 'Pendiente',
          }))
        );
      }
    } catch (e) {
      console.warn('Usando estado local:', e);
    }
  };

  // Función para aprobar o rechazar solicitudes de bots
  const handleBotAuth = async (id: string, decision: 'Aprobado' | 'Rechazado') => {
    setBotRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status: decision } : req))
    );

    const targetReq = botRequests.find((r) => r.id === id);
    if (decision === 'Aprobado' && targetReq) {
      const newTask: Task = {
        id: Date.now().toString(),
        title: targetReq.payload.title,
        description: `Aprobado automáticamente por solicitud del bot ${targetReq.bot_name}`,
        category: targetReq.payload.category as Task['category'],
        priority: targetReq.payload.priority as Task['priority'],
        status: 'Pendiente',
        phi_flag: true,
      };
      setTasks((prev) => [newTask, ...prev]);

      // Guardar en Supabase si es un UUID válido de la base
      if (id.length > 20) {
        await supabase.from('tasks').insert([
          {
            title: targetReq.payload.title,
            description: `Aprobado por el usuario (Bot: ${targetReq.bot_name})`,
            category: targetReq.payload.category,
            phi_flag: true,
            created_by_bot: targetReq.bot_name,
          },
        ]);
        await supabase.from('bot_authorizations').update({ status: 'approved' }).eq('id', id);
        await supabase.from('bot_audit_logs').insert([
          {
            bot_name: targetReq.bot_name,
            action_type: 'TASK_APPROVED',
            authorization_id: id,
            accessed_phi: true,
            ip_address: '127.0.0.1',
          },
        ]);
      }
    } else if (decision === 'Rechazado' && targetReq && id.length > 20) {
      await supabase.from('bot_authorizations').update({ status: 'rejected' }).eq('id', id);
      await supabase.from('bot_audit_logs').insert([
        {
          bot_name: targetReq.bot_name,
          action_type: 'TASK_REJECTED',
          authorization_id: id,
          accessed_phi: false,
          ip_address: '127.0.0.1',
        },
      ]);
    }
  };

  // Crear nueva tarea manual
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      description: newDesc.trim(),
      category: newCategory,
      priority: newPriority,
      status: 'Pendiente',
      phi_flag: newPhiFlag,
    };

    setTasks((prev) => [newTask, ...prev]);
    setIsModalOpen(false);
    setNewTitle('');
    setNewDesc('');
    setNewPhiFlag(false);

    // Persistir en Supabase
    try {
      await supabase.from('tasks').insert([
        {
          title: newTask.title,
          description: newTask.description,
          category: newTask.category,
          phi_flag: newTask.phi_flag,
          quadrant: newTask.priority === 'Alta' ? 'urgent_important' : newTask.priority === 'Media' ? 'not_urgent_important' : 'not_urgent_not_important',
        },
      ]);
    } catch (err) {
      console.warn('Guardado localmente:', err);
    }
  };

  const filteredTasks =
    activeTab === 'Todas' ? tasks : tasks.filter((t) => t.category === activeTab);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header de la App */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center shadow-md">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-600 text-white p-2 rounded-lg font-bold tracking-wider text-sm">TG</div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">TaskGuard Desktop</h1>
            <p className="text-xs text-slate-400">Priorizador Seguro (HIPAA & PHI Compliant)</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-block w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-xs text-emerald-400 font-medium">Supabase Conectado</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Contenido Principal */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Panel de Solicitudes Pendientes de los Bots (Human-in-the-Loop) */}
          {botRequests.filter((r) => r.status === 'Pendiente').length > 0 && (
            <div className="mb-6 bg-amber-950/40 border border-amber-600/50 rounded-xl p-4 shadow-lg backdrop-blur-sm">
              <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center">
                <span className="mr-2">⚠️</span> Autorización Requerida para Bots (Dots / Musa)
              </h2>
              <div className="space-y-3">
                {botRequests
                  .filter((r) => r.status === 'Pendiente')
                  .map((req) => (
                    <div
                      key={req.id}
                      className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 flex justify-between items-center"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">
                          El bot <span className="text-amber-400 font-bold">{req.bot_name}</span> solicita registrar una tarea:
                        </p>
                        <p className="text-xs text-slate-300 mt-1 font-mono bg-slate-900/50 p-1.5 rounded">
                          "{req.payload.title}" [{req.payload.category} - {req.payload.priority}]
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleBotAuth(req.id, 'Aprobado')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded transition cursor-pointer"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleBotAuth(req.id, 'Rechazado')}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded transition cursor-pointer"
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Filtros por Categoría */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex space-x-2">
              {(['Todas', 'Clinica', 'Administrativa', 'Personal'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {tab === 'Clinica' ? 'Clínica' : tab}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
            >
              + Nueva Tarea
            </button>
          </div>

          {/* Grid de Tareas (Matriz / Listado) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`bg-slate-800 border rounded-xl p-4 flex flex-col justify-between transition hover:border-slate-600 ${
                  task.phi_flag ? 'border-rose-500/50 shadow-rose-950/20 shadow-lg' : 'border-slate-700'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                        task.category === 'Clinica'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : task.category === 'Administrativa'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {task.category === 'Clinica' ? 'Clínica' : task.category}
                    </span>
                    {task.phi_flag && (
                      <span className="text-[10px] bg-rose-950 text-rose-400 border border-rose-800 px-2 py-0.5 rounded font-mono font-semibold flex items-center">
                        🔒 PHI / HIPAA
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">{task.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{task.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700 flex justify-between items-center text-xs">
                  <span
                    className={`font-semibold ${
                      task.priority === 'Alta'
                        ? 'text-rose-400'
                        : task.priority === 'Media'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    Prioridad: {task.priority}
                  </span>
                  <span className="text-slate-400 bg-slate-900 px-2 py-1 rounded">
                    {task.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Modal Nueva Tarea */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Nueva Actividad Médica</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Título *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Evaluación cardiológica Sala 4"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Descripción</label>
                <textarea
                  rows={2}
                  placeholder="Detalles clínicos o administrativos..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Categoría</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="Clinica">Clínica</option>
                    <option value="Administrativa">Administrativa</option>
                    <option value="Personal">Personal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Prioridad</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-slate-700">
                <span className="text-xs font-semibold text-rose-300">🔒 Contiene Datos PHI (HIPAA)</span>
                <input
                  type="checkbox"
                  checked={newPhiFlag}
                  onChange={(e) => setNewPhiFlag(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-xs font-semibold rounded-lg text-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold rounded-lg text-white cursor-pointer"
                >
                  Crear Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
