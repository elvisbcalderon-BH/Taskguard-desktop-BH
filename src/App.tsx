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
  recurring_monthly: boolean; // Renovable automáticamente cada mes
}

export default function TaskGuardDashboard() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Chat GPT (Blessing Hands)',
      description: 'Suscripción mensual de IA para la empresa.',
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
      title: 'BH Cell Phone (Blessing Hands)',
      description: 'Línea telefónica corporativa BH.',
      category: 'Negocio (BH)',
      priority: 'Alta',
      amount: 9,
      status: 'Pendiente',
      phi_flag: false,
      bot_access: true,
      due_date: '2026-10-19',
      recurring_monthly: true,
    },
    {
      id: '3',
      title: 'iFax (Blessing Hands)',
      description: 'Servicio de fax médico y administrativo BH.',
      category: 'Negocio (BH)',
      priority: 'Alta',
      amount: 55,
      status: 'Pendiente',
      phi_flag: false,
      bot_access: true,
      due_date: '2026-10-24',
      recurring_monthly: true,
    },
    {
      id: '4',
      title: 'Alquiler / Hipoteca (Casa)',
      description: 'Pago mensual de vivienda.',
      category: 'Administrativa',
      priority: 'Alta',
      amount: 1300,
      status: 'Pendiente',
      phi_flag: false,
      bot_access: false,
      due_date: '2026-09-30',
      recurring_monthly: true,
    },
  ]);

  const [activeTab, setActiveTab] = useState<'Todas' | 'Clinica' | 'Administrativa' | 'Personal' | 'Negocio (BH)'>('Todas');
  const [showAddModal, setShowAddModal] = useState(false);

  // Estados para nueva tarea / gasto
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<'Clinica' | 'Administrativa' | 'Personal' | 'Negocio (BH)'>('Negocio (BH)');
  const [newPriority, setNewPriority] = useState<'Alta' | 'Media' | 'Baja'>('Alta');
  const [newAmount, setNewAmount] = useState(0);
  const [newDueDate, setNewDueDate] = useState('');
  const [newRecurring, setNewRecurring] = useState(true);
  const [newPhi, setNewPhi] = useState(false);

  // Sincronización Realtime con Supabase
  useEffect(() => {
    fetchFromSupabase();

    const channel = supabase
      .channel('schema-db-changes-v6')
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

  // 1. FUNCIÓN DE RENOVACIÓN MENSUAL AUTOMÁTICA (Al pagar, avanza 1 mes)
  const handleMarkAsPaidAndRenew = async (id: string) => {
    let nextDateComputed = '';

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === id) {
          let nextDate = task.due_date;
          if (task.recurring_monthly && task.due_date) {
            const currentDate = new Date(task.due_date);
            currentDate.setMonth(currentDate.getMonth() + 1); // Sumar 1 mes manteniendo la referencia
            nextDate = currentDate.toISOString().split('T')[0];
          }
          nextDateComputed = nextDate;
          return {
            ...task,
            status: 'Pagado',
            due_date: nextDate, // Fecha actualizada automáticamente al mes siguiente
          };
        }
        return task;
      })
    );

    // Persistir en Supabase
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

  // 2. ELIMINAR TAREA / GASTO
  const handleDeleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (id.length > 20) {
      try {
        await supabase.from('tasks').delete().eq('id', id);
      } catch (err) {
        console.warn('Error eliminando de base:', err);
      }
    }
  };

  // 3. AGREGAR NUEVA TAREA / OBLIGACIÓN
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDueDate) return;

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTitle,
      description: newDesc,
      category: newCategory,
      priority: newPriority,
      amount: Number(newAmount),
      status: 'Pendiente',
      phi_flag: newPhi,
      bot_access: newCategory !== 'Clinica',
      due_date: newDueDate,
      recurring_monthly: newRecurring,
    };

    setTasks((prev) => [...prev, newTask]);
    setNewTitle('');
    setNewDesc('');
    setNewAmount(0);
    setNewDueDate('');
    setShowAddModal(false);

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
      console.warn('Guardado en estado reactivo:', err);
    }
  };

  // 4. IMPRIMIR / EXPORTAR REPORTE
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

  const filteredTasks = activeTab === 'Todas' ? tasks : tasks.filter((t) => t.category === activeTab);
  const sortedTasks = [...filteredTasks].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  // Cálculo de totales financieros por filtro activo
  const totalAmount = filteredTasks.reduce((sum, item) => sum + item.amount, 0);

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
          <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono font-bold text-emerald-400">
            Total en Vista: ${totalAmount.toLocaleString()} USD
          </div>
          <button
            onClick={handlePrintReport}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
          >
            🖨️ Imprimir / Reporte
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
          >
            + Nueva Obligación / Tarea
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Pestañas de Filtro */}
          <div className="flex justify-between items-center mb-6 print:hidden">
            <div className="flex space-x-2">
              {(['Todas', 'Negocio (BH)', 'Clinica', 'Administrativa', 'Personal'] as const).map((tab) => (
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

            <div className="flex items-center space-x-2">
              <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-emerald-400 font-medium">Supabase Conectado</span>
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
              <div className="col-span-3 text-center">Acciones & Renovación Mensual</div>
            </div>

            <div className="divide-y divide-slate-700/60">
              {sortedTasks.map((task) => {
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
                      {task.recurring_monthly && (
                        <span className="text-[9px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded w-fit font-mono">
                          🔄 Mensual
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

                    <div className="col-span-3 flex justify-end items-center space-x-2 print:hidden">
                      {task.status !== 'Pagado' ? (
                        <button
                          onClick={() => handleMarkAsPaidAndRenew(task.id)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded shadow transition cursor-pointer"
                          title="Marca como pagado y avanza automáticamente al próximo mes"
                        >
                          ✔ Pagar & Renovar Mes
                        </button>
                      ) : (
                        <span className="text-blue-400 text-[10px] font-bold bg-blue-950 px-2 py-1 rounded border border-blue-800">
                          Pagado (Próx: {task.due_date})
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="px-2 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 text-[10px] font-bold rounded border border-rose-800 transition cursor-pointer"
                        title="Eliminar registro"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal para Agregar Nueva Tarea / Gasto */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 z-50 print:hidden">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
                <h3 className="text-base font-bold text-white mb-4">Agregar Nueva Obligación o Actividad</h3>
                <form onSubmit={handleAddTask} className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Título / Concepto</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Ej. iFax (Blessing Hands)"
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Categoría</label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value as any)}
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
                        value={newAmount}
                        onChange={(e) => setNewAmount(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Fecha de Vencimiento / Pago</label>
                      <input
                        type="date"
                        value={newDueDate}
                        onChange={(e) => setNewDueDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Prioridad</label>
                      <select
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value as any)}
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
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white focus:outline-none"
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center space-x-4 text-xs">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newRecurring}
                        onChange={(e) => setNewRecurring(e.target.checked)}
                        className="rounded cursor-pointer"
                      />
                      <span>Renovación automática mensual</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newPhi}
                        onChange={(e) => setNewPhi(e.target.checked)}
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
                      Guardar Obligación
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
