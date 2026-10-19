import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

export interface Task {
  id: string;
  title: string;
  description: string;
  category: 'Clinica' | 'Administrativa' | 'Personal' | 'Negocio (BH)';
  priority: 'Alta' | 'Media' | 'Baja';
  amount: number;
  status: 'Pendiente' | 'Pagado' | 'En Progreso';
  phi_flag: boolean;
  bot_access: boolean;
  due_date: string; // YYYY-MM-DD
  recurring_monthly: boolean;
}

export default function TaskGuardDashboard() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Chat GPT (Blessing Hands)',
      description: 'Suscripción mensual de IA corporativa para operaciones y redacción.',
      category: 'Negocio (BH)',
      priority: 'Alta',
      amount: 55,
      status: 'Pendiente',
      phi_flag: false,
      bot_access: true,
      due_date: '2026-10-16',
      recurring_monthly: true,
    },
    {
      id: '2',
      title: 'Revisión de resultados de laboratorio - Paciente A',
      description: 'Verificar valores críticos en gabinete clínico y ajustar dosis.',
      category: 'Clinica',
      priority: 'Alta',
      amount: 0,
      status: 'Pendiente',
      phi_flag: true, // Datos médicos protegidos
      bot_access: false,
      due_date: '2026-10-15',
      recurring_monthly: false,
    },
    {
      id: '3',
      title: 'Alquiler / Hipoteca (Casa)',
      description: 'Pago mensual correspondiente al hogar.',
      category: 'Administrativa',
      priority: 'Alta',
      amount: 1300,
      status: 'Pendiente',
      phi_flag: false,
      bot_access: false,
      due_date: '2026-10-30',
      recurring_monthly: true,
    },
  ]);

  // Estado para el Filtro Activo
  const [activeTab, setActiveTab] = useState<'Todas' | 'Negocio (BH)' | 'Clinica' | 'Administrativa' | 'Personal'>('Todas');

  // Estados para Modales (Crear/Editar, Ver Detalles "Ojito")
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null); // Modal del Ojito
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Campos del formulario
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState<'Clinica' | 'Administrativa' | 'Personal' | 'Negocio (BH)'>('Negocio (BH)');
  const [formPriority, setFormPriority] = useState<'Alta' | 'Media' | 'Baja'>('Alta');
  const [formAmount, setFormAmount] = useState(0);
  const [formDueDate, setFormDueDate] = useState('');
  const [formRecurring, setFormRecurring] = useState(true);
  const [formPhi, setFormPhi] = useState(false);

  // Sincronización Realtime con Supabase
  useEffect(() => {
    fetchFromSupabase();

    const channel = supabase
      .channel('schema-db-changes-v8')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
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
            category: (t.category as Task['category']) || 'Negocio (BH)',
            priority: (t.quadrant === 'urgent_important' ? 'Alta' : t.quadrant === 'not_urgent_important' ? 'Media' : 'Baja'),
            amount: Number(t.amount || 0),
            status: t.status === 'completed' || t.status === 'Pagado' ? 'Pagado' : t.status === 'in_progress' ? 'En Progreso' : 'Pendiente',
            phi_flag: !!t.phi_flag,
            bot_access: t.bot_access !== undefined ? !!t.bot_access : !t.phi_flag,
            due_date: t.due_date ? t.due_date.substring(0, 10) : '2026-10-20',
            recurring_monthly: t.recurring_monthly !== undefined ? !!t.recurring_monthly : true,
          }))
        );
      }
    } catch (e) {
      console.warn('Usando estado reactivo local:', e);
    }
  };

  // Abrir modal para crear
  const openAddModal = () => {
    setEditingTask(null);
    setFormTitle('');
    setFormDesc('');
    setFormCategory('Negocio (BH)');
    setFormPriority('Alta');
    setFormAmount(0);
    setFormDueDate('');
    setFormRecurring(true);
    setFormPhi(false);
    setShowAddModal(true);
  };

  // Abrir modal para editar
  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDesc(task.description);
    setFormCategory(task.category);
    setFormPriority(task.priority);
    setFormAmount(task.amount);
    setFormDueDate(task.due_date);
    setFormRecurring(task.recurring_monthly);
    setFormPhi(task.phi_flag);
    setShowAddModal(true);
  };

  // Guardar (Crear o Actualizar)
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDueDate) return;

    if (editingTask) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTask.id
            ? {
                ...t,
                title: formTitle,
                description: formDesc,
                category: formCategory,
                priority: formPriority,
                amount: Number(formAmount),
                due_date: formDueDate,
                recurring_monthly: formRecurring,
                phi_flag: formPhi,
              }
            : t
        )
      );

      if (editingTask.id.length > 20) {
        try {
          await supabase
            .from('tasks')
            .update({
              title: formTitle,
              description: formDesc,
              category: formCategory,
              amount: Number(formAmount),
              due_date: new Date(formDueDate).toISOString(),
              recurring_monthly: formRecurring,
              phi_flag: formPhi,
              quadrant: formPriority === 'Alta' ? 'urgent_important' : formPriority === 'Media' ? 'not_urgent_important' : 'not_urgent_not_important',
            })
            .eq('id', editingTask.id);
        } catch (err) {
          console.warn('Error actualizando en Supabase:', err);
        }
      }
    } else {
      const newTask: Task = {
        id: Date.now().toString(),
        title: formTitle,
        description: formDesc,
        category: formCategory,
        priority: formPriority,
        amount: Number(formAmount),
        status: 'Pendiente',
        phi_flag: formPhi,
        bot_access: formCategory !== 'Clinica',
        due_date: formDueDate,
        recurring_monthly: formRecurring,
      };
      setTasks((prev) => [...prev, newTask]);

      try {
        await supabase.from('tasks').insert([
          {
            title: newTask.title,
            description: newTask.description,
            category: newTask.category,
            amount: newTask.amount,
            recurring_monthly: newTask.recurring_monthly,
            phi_flag: newTask.phi_flag,
            bot_access: newTask.bot_access,
            due_date: new Date(newTask.due_date).toISOString(),
            quadrant: newTask.priority === 'Alta' ? 'urgent_important' : newTask.priority === 'Media' ? 'not_urgent_important' : 'not_urgent_not_important',
          },
        ]);
      } catch (err) {
        console.warn('Error guardando en Supabase:', err);
      }
    }
    setShowAddModal(false);
  };

  // Marcar pagado y renovar mes automáticamente
  const handleMarkAsPaidAndRenew = async (id: string) => {
    let nextDateComputed = '';

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === id) {
          let nextDate = task.due_date;
          if (task.recurring_monthly && task.due_date) {
            const currentDate = new Date(task.due_date);
            currentDate.setMonth(currentDate.getMonth() + 1);
            nextDate = currentDate.toISOString().split('T')[0];
          }
          nextDateComputed = nextDate;
          return {
            ...task,
            status: 'Pagado',
            due_date: nextDate,
          };
        }
        return task;
      })
    );

    if (id.length > 20) {
      try {
        await supabase
          .from('tasks')
          .update({
            status: 'completed',
            due_date: new Date(nextDateComputed).toISOString(),
          })
          .eq('id', id);

        await supabase.from('bot_audit_logs').insert([
          {
            bot_name: 'Financial-Operator',
            action_type: 'PAYMENT_AND_RENEWAL',
            task_id: id,
            accessed_phi: false,
            event_details: { new_due_date: nextDateComputed, action: 'monthly_renewal' },
            ip_address: '127.0.0.1',
          },
        ]);
      } catch (err) {
        console.warn('Error sincronizando renovación:', err);
      }
    }
  };

  const handleDeleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (id.length > 20) {
      try {
        await supabase.from('tasks').delete().eq('id', id);
      } catch (err) {
        console.warn('Error eliminando en Supabase:', err);
      }
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  // Semáforo visual
  const getTrafficLightStatus = (dueDateStr: string, priority: string, status: string) => {
    if (status === 'Pagado') {
      return { indicator: 'bg-blue-500', badge: 'bg-blue-950 text-blue-400 border border-blue-800', text: 'Pagado (Renovado)' };
    }
    const today = new Date('2026-10-19');
    const dueDate = new Date(dueDateStr);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0 || priority === 'Alta') {
      return { indicator: 'bg-rose-500 animate-pulse', badge: 'bg-rose-950 text-rose-400 border border-rose-800', text: diffDays < 0 ? `Vencida (${Math.abs(diffDays)}d)` : 'Crítico' };
    } else if (diffDays <= 3 || priority === 'Media') {
      return { indicator: 'bg-amber-500', badge: 'bg-amber-950 text-amber-400 border border-amber-800', text: diffDays === 0 ? 'Vence HOY' : `Próximo (${diffDays}d)` };
    } else {
      return { indicator: 'bg-emerald-500', badge: 'bg-emerald-950 text-emerald-400 border border-emerald-800', text: `A tiempo (${diffDays}d)` };
    }
  };

  // Filtrado estricto por categoría seleccionada
  const filteredTasks = activeTab === 'Todas' ? tasks : tasks.filter((t) => t.category === activeTab);
  const sortedTasks = [...filteredTasks].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center shadow-md print:hidden">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-600 text-white p-2 rounded-lg font-bold tracking-wider text-sm shadow-md">TG</div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">TaskGuard Desktop - Casa & Blessing Hands (BH)</h1>
            <p className="text-xs text-slate-400">Control Financiero, Actividades y Seguridad HIPAA/PHI</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrintReport}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
          >
            🖨️ Imprimir / Reporte
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
          >
            + Nueva Obligación / Tarea
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 p-6 overflow-y-auto">
          {/* BOTONES DE FILTRO RÁPIDO POR CATEGORÍA */}
          <div className="flex flex-wrap items-center justify-between mb-6 gap-2 print:hidden">
            <div className="flex space-x-2">
              {(['Todas', 'Negocio (BH)', 'Clinica', 'Administrativa', 'Personal'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition shadow cursor-pointer ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {tab === 'Clinica' ? 'Clínica' : tab}{' '}
                  {tab === 'Todas'
                    ? `(${tasks.length})`
                    : `(${tasks.filter((t) => t.category === tab).length})`}
                </button>
              ))}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Mostrando: <span className="text-emerald-400 font-bold">{filteredTasks.length}</span> registros
            </div>
          </div>

          {/* Tabla de Listado */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
            <div className="grid grid-cols-12 bg-slate-800/90 px-4 py-3 border-b border-slate-700 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <div className="col-span-1 text-center">Semáforo</div>
              <div className="col-span-3">Concepto / Obligación</div>
              <div className="col-span-2">Categoría & BH</div>
              <div className="col-span-1 text-right">Monto</div>
              <div className="col-span-2">Vencimiento</div>
              <div className="col-span-3 text-center">Acciones (Ver, Editar, Pagar)</div>
            </div>

            <div className="divide-y divide-slate-700/60">
              {sortedTasks.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No hay actividades registradas en esta categoría.
                </div>
              ) : (
                sortedTasks.map((task) => {
                  const traffic = getTrafficLightStatus(task.due_date, task.priority, task.status);

                  return (
                    <div
                      key={task.id}
                      className="grid grid-cols-12 px-4 py-3 items-center hover:bg-slate-750/70 transition text-xs"
                    >
                      <div className="col-span-1 flex justify-center items-center">
                        <span className={`w-3.5 h-3.5 rounded-full shadow-md ${traffic.indicator}`} title={traffic.text}></span>
                      </div>

                      <div className="col-span-3 pr-2">
                        <h4 className="font-bold text-white text-sm mb-0.5">{task.title}</h4>
                        <p className="text-slate-400 text-[11px] truncate">{task.description}</p>
                      </div>

                      <div className="col-span-2 flex flex-col space-y-1">
                        <span
                          className={`inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded w-fit ${
                            task.category === 'Negocio (BH)'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : task.category === 'Clinica'
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : 'bg-blue-950 text-blue-300 border border-blue-800'
                          }`}
                        >
                          {task.category}
                        </span>
                        {task.phi_flag && (
                          <span className="text-[9px] bg-rose-950 text-rose-400 border border-rose-800 px-1.5 py-0.5 rounded font-mono font-semibold w-fit">
                            🔒 HIPAA / PHI
                          </span>
                        )}
                      </div>

                      <div className="col-span-1 text-right font-mono font-bold text-emerald-400">
                        ${task.amount} USD
                      </div>

                      <div className="col-span-2">
                        <span className="font-mono font-semibold text-slate-200 block text-xs">{task.due_date}</span>
                        <span className={`inline-block font-bold px-1.5 py-0.5 rounded text-[10px] mt-1 ${traffic.badge}`}>
                          {traffic.text}
                        </span>
                      </div>

                      {/* ACCIONES: VER (OJITO), PAGAR, EDITAR, ELIMINAR */}
                      <div className="col-span-3 flex justify-end items-center space-x-1.5 print:hidden">
                        <button
                          onClick={() => setViewingTask(task)}
                          className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] font-bold rounded border border-slate-600 transition cursor-pointer"
                          title="Ver detalles completos"
                        >
                          👁️ Ver
                        </button>

                        {task.status !== 'Pagado' ? (
                          <button
                            onClick={() => handleMarkAsPaidAndRenew(task.id)}
                            className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded shadow transition cursor-pointer"
                            title="Pagar y renovar mes"
                          >
                            ✔ Pagar
                          </button>
                        ) : (
                          <span className="text-blue-400 text-[9px] font-bold bg-blue-950 px-1.5 py-1 rounded border border-blue-800">
                            Pagado
                          </span>
                        )}

                        <button
                          onClick={() => openEditModal(task)}
                          className="px-2 py-1.5 bg-sky-950 hover:bg-sky-900 text-sky-300 text-[10px] font-bold rounded border border-sky-800 transition cursor-pointer"
                          title="Editar error o datos"
                        >
                          ✏️ Editar
                        </button>

                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="px-2 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 text-[10px] font-bold rounded border border-rose-800 transition cursor-pointer"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* MODAL DEL "OJITO" (VER DETALLES COMPLETOS) */}
          {viewingTask && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 z-50 print:hidden">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-lg shadow-2xl space-y-4">
                <div className="flex justify-between items-start border-b border-slate-700 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                      {viewingTask.category}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1">{viewingTask.title}</h3>
                  </div>
                  <button
                    onClick={() => setViewingTask(null)}
                    className="text-slate-400 hover:text-white text-sm font-bold bg-slate-700 px-2.5 py-1 rounded cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-semibold mb-1">Descripción / Notas:</span>
                    <p className="text-slate-200 bg-slate-900 p-3 rounded border border-slate-700">
                      {viewingTask.description || 'Sin notas adicionales.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900 p-2.5 rounded border border-slate-700">
                      <span className="text-slate-400 block text-[10px]">Monto Financiero:</span>
                      <span className="text-emerald-400 font-mono font-bold text-sm">
                        ${viewingTask.amount} USD
                      </span>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded border border-slate-700">
                      <span className="text-slate-400 block text-[10px]">Fecha de Vencimiento:</span>
                      <span className="text-slate-200 font-mono font-bold text-sm">
                        {viewingTask.due_date}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900 p-2.5 rounded border border-slate-700">
                      <span className="text-slate-400 block text-[10px]">Prioridad Asignada:</span>
                      <span className="text-amber-400 font-bold">{viewingTask.priority}</span>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded border border-slate-700">
                      <span className="text-slate-400 block text-[10px]">Renovación Mensual:</span>
                      <span className="text-blue-400 font-bold">
                        {viewingTask.recurring_monthly ? 'Sí (Automática)' : 'No'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-3 rounded border border-slate-700 flex justify-between items-center">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Seguridad & Privacidad HIPAA:</span>
                      <span
                        className={viewingTask.phi_flag ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}
                      >
                        {viewingTask.phi_flag ? '🔒 Contiene PHI (Protegido)' : 'Público / Estándar'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Acceso para Bots (Dots / Musa):</span>
                      <span
                        className={viewingTask.bot_access ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}
                      >
                        {viewingTask.bot_access ? '✔ Permitido' : '✖ Bloqueado (Privado)'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setViewingTask(null)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded cursor-pointer"
                  >
                    Cerrar Vista
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL DE CREAR / EDITAR */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 z-50 print:hidden">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
                <h3 className="text-base font-bold text-white mb-4">
                  {editingTask ? '✏️ Editar Obligación o Actividad' : '➕ Nueva Obligación o Actividad'}
                </h3>
                <form onSubmit={handleSaveTask} className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Título / Concepto</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Ej. iFax (Blessing Hands)"
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Categoría</label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white focus:outline-none"
                      >
                        <option value="Negocio (BH)">Negocio (Blessing Hands)</option>
                        <option value="Administrativa">Administrativa / Casa</option>
                        <option value="Clinica">Clínica</option>
                        <option value="Personal">Personal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Monto ($ USD)</label>
                      <input
                        type="number"
                        value={formAmount}
                        onChange={(e) => setFormAmount(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Fecha de Vencimiento</label>
                      <input
                        type="date"
                        value={formDueDate}
                        onChange={(e) => setFormDueDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Prioridad</label>
                      <select
                        value={formPriority}
                        onChange={(e) => setFormPriority(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white focus:outline-none"
                      >
                        <option value="Alta">Alta</option>
                        <option value="Media">Media</option>
                        <option value="Baja">Baja</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Descripción / Notas</label>
                    <textarea
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white focus:outline-none"
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center space-x-4 text-xs">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formRecurring}
                        onChange={(e) => setFormRecurring(e.target.checked)}
                        className="rounded cursor-pointer"
                      />
                      <span>Renovación automática mensual</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formPhi}
                        onChange={(e) => setFormPhi(e.target.checked)}
                        className="rounded cursor-pointer"
                      />
                      <span className="text-rose-300">🔒 PHI</span>
                    </label>
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded cursor-pointer"
                    >
                      {editingTask ? 'Actualizar Cambios' : 'Guardar Obligación'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
