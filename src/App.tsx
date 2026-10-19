import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { TaskGuardLogo } from './components/TaskGuardLogo';

export interface Installment {
  id: string;
  date: string;
  amount: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: 'Clinical' | 'Administrative' | 'Personal' | 'Business (BH)';
  priority: 'High' | 'Medium' | 'Low';
  amount: number; // Monto total de la factura
  status: 'Pending' | 'Partial' | 'Paid';
  phi_flag: boolean;
  bot_access: boolean;
  due_date: string; // Vencimiento actual o próxima cuota
  recurring_monthly: boolean;
  installments: Installment[]; // Historial de cuotas pagadas
}

export default function TaskGuardDashboard() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Pending Rent / Mortgage Balance',
      description: 'Major monthly housing bill split into two installment payments.',
      category: 'Administrative',
      priority: 'High',
      amount: 1300,
      status: 'Partial',
      phi_flag: false,
      bot_access: false,
      due_date: '2026-10-30',
      recurring_monthly: true,
      installments: [
        { id: 'inst-1', date: '2026-10-01', amount: 650 }, // Primera cuota abonada
      ],
    },
    {
      id: '2',
      title: 'ChatGPT (Blessing Hands)',
      description: 'Corporate monthly AI operations subscription.',
      category: 'Business (BH)',
      priority: 'High',
      amount: 55,
      status: 'Pending',
      phi_flag: false,
      bot_access: true,
      due_date: '2026-10-16',
      recurring_monthly: true,
      installments: [],
    },
    {
      id: '3',
      title: 'BH Cell Phone (Blessing Hands)',
      description: 'Corporate wireless communication line for company staff.',
      category: 'Business (BH)',
      priority: 'High',
      amount: 9,
      status: 'Pending',
      phi_flag: false,
      bot_access: true,
      due_date: '2026-10-19',
      recurring_monthly: true,
      installments: [],
    },
    {
      id: '4',
      title: 'iFax (Blessing Hands)',
      description: 'HIPAA-compliant cloud clinical fax service.',
      category: 'Business (BH)',
      priority: 'High',
      amount: 55,
      status: 'Pending',
      phi_flag: false,
      bot_access: true,
      due_date: '2026-10-24',
      recurring_monthly: true,
      installments: [],
    },
  ]);

  const [activeTab, setActiveTab] = useState<'All' | 'Business (BH)' | 'Clinical' | 'Administrative' | 'Personal'>('All');

  // Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [paymentModalTask, setPaymentModalTask] = useState<Task | null>(null); // Modal de Cuotas
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Campos para abonar cuota
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState('2026-10-19');
  const [nextDueDate, setNextDueDate] = useState('');

  // Campos del formulario general
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState<'Clinical' | 'Administrative' | 'Personal' | 'Business (BH)'>('Business (BH)');
  const [formPriority, setFormPriority] = useState<'High' | 'Medium' | 'Low'>('High');
  const [formAmount, setFormAmount] = useState(0);
  const [formDueDate, setFormDueDate] = useState('');
  const [formRecurring, setFormRecurring] = useState(true);
  const [formPhi, setFormPhi] = useState(false);

  // Sincronización Realtime con Supabase
  useEffect(() => {
    fetchFromSupabase();

    const channel = supabase
      .channel('schema-db-changes-v10-installments')
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
          dbTasks.map((t) => {
            let cat: Task['category'] = 'Business (BH)';
            if (t.category === 'Clinica' || t.category === 'Clinical') cat = 'Clinical';
            else if (t.category === 'Administrativa' || t.category === 'Administrative') cat = 'Administrative';
            else if (t.category === 'Personal') cat = 'Personal';

            let prio: Task['priority'] = 'High';
            if (t.priority === 'Media' || t.quadrant === 'not_urgent_important') prio = 'Medium';
            else if (t.priority === 'Baja' || t.quadrant === 'not_urgent_not_important') prio = 'Low';

            let stat: Task['status'] = 'Pending';
            if (t.status === 'completed' || t.status === 'Paid' || t.status === 'Pagado') stat = 'Paid';
            else if (t.status === 'Partial' || t.status === 'Parcial') stat = 'Partial';

            const instList: Installment[] = Array.isArray(t.installments) ? t.installments : [];

            return {
              id: t.id,
              title: t.title,
              description: t.description || '',
              category: cat,
              priority: prio,
              amount: Number(t.amount || 0),
              status: stat,
              phi_flag: !!t.phi_flag,
              bot_access: t.bot_access !== undefined ? !!t.bot_access : !t.phi_flag,
              due_date: t.due_date ? t.due_date.substring(0, 10) : '2026-10-20',
              recurring_monthly: t.recurring_monthly !== undefined ? !!t.recurring_monthly : true,
              installments: instList,
            };
          })
        );
      }
    } catch (e) {
      console.warn('Using local reactive state:', e);
    }
  };

  // Abrir modal de pagos / cuotas
  const openPaymentModal = (task: Task) => {
    setPaymentModalTask(task);
    const totalPaidSoFar = task.installments.reduce((sum, inst) => sum + inst.amount, 0);
    const remainingBalance = Math.max(0, task.amount - totalPaidSoFar);
    setPaymentAmount(remainingBalance > 0 ? remainingBalance : task.amount);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setNextDueDate(task.due_date);
  };

  // Registrar un abono (cuota)
  const handleRegisterInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalTask || paymentAmount <= 0) return;

    const newInstallment: Installment = {
      id: Date.now().toString(),
      date: paymentDate,
      amount: Number(paymentAmount),
    };

    const updatedInstallments = [...paymentModalTask.installments, newInstallment];
    const totalPaidSoFar = updatedInstallments.reduce((sum, inst) => sum + inst.amount, 0);
    const isFullyPaid = totalPaidSoFar >= paymentModalTask.amount;

    let targetDueDate = paymentModalTask.due_date;
    if (isFullyPaid && paymentModalTask.recurring_monthly && nextDueDate) {
      targetDueDate = nextDueDate;
    }

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === paymentModalTask.id) {
          return {
            ...t,
            status: isFullyPaid ? 'Paid' : 'Partial',
            installments: updatedInstallments,
            due_date: targetDueDate,
          };
        }
        return t;
      })
    );

    // Persistir en Supabase
    if (paymentModalTask.id.length > 20) {
      try {
        await supabase
          .from('tasks')
          .update({
            status: isFullyPaid ? 'completed' : 'Partial',
            installments: updatedInstallments,
            due_date: new Date(targetDueDate).toISOString(),
          })
          .eq('id', paymentModalTask.id);

        await supabase.from('bot_audit_logs').insert([
          {
            bot_name: 'Financial-Operator',
            action_type: isFullyPaid ? 'FULL_PAYMENT_COMPLETED' : 'PARTIAL_INSTALLMENT_PAID',
            task_id: paymentModalTask.id,
            accessed_phi: false,
            event_details: {
              installment_amount: Number(paymentAmount),
              installment_date: paymentDate,
              total_paid_so_far: totalPaidSoFar,
              is_fully_paid: isFullyPaid,
            },
            ip_address: '127.0.0.1',
          },
        ]);
      } catch (err) {
        console.warn('Error syncing installment with Supabase:', err);
      }
    }

    setPaymentModalTask(null);
  };

  // Abrir modal de creación
  const openAddModal = () => {
    setEditingTask(null);
    setFormTitle('');
    setFormDesc('');
    setFormCategory('Business (BH)');
    setFormPriority('High');
    setFormAmount(0);
    setFormDueDate('');
    setFormRecurring(true);
    setFormPhi(false);
    setShowAddModal(true);
  };

  // Abrir modal de edición
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
            })
            .eq('id', editingTask.id);
        } catch (err) {
          console.warn('Error updating in Supabase:', err);
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
        status: 'Pending',
        phi_flag: formPhi,
        bot_access: formCategory !== 'Clinical',
        due_date: formDueDate,
        recurring_monthly: formRecurring,
        installments: [],
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
            installments: [],
          },
        ]);
      } catch (err) {
        console.warn('Error saving in Supabase:', err);
      }
    }
    setShowAddModal(false);
  };

  const handleDeleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (id.length > 20) {
      try {
        await supabase.from('tasks').delete().eq('id', id);
      } catch (err) {
        console.warn('Error deleting in Supabase:', err);
      }
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  // Semáforo visual
  const getTrafficLightStatus = (task: Task) => {
    if (task.status === 'Paid') {
      return { indicator: 'bg-blue-500', badge: 'bg-blue-950 text-blue-400 border border-blue-800', text: 'Fully Paid' };
    }
    if (task.status === 'Partial') {
      return { indicator: 'bg-amber-500', badge: 'bg-amber-950 text-amber-400 border border-amber-800', text: 'Partial / Installments' };
    }
    const today = new Date('2026-10-19');
    const dueDate = new Date(task.due_date);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0 || task.priority === 'High') {
      return { indicator: 'bg-rose-500 animate-pulse', badge: 'bg-rose-950 text-rose-400 border border-rose-800', text: diffDays < 0 ? `Overdue (${Math.abs(diffDays)}d)` : 'Critical' };
    } else if (diffDays <= 3 || task.priority === 'Medium') {
      return { indicator: 'bg-amber-500', badge: 'bg-amber-950 text-amber-400 border border-amber-800', text: diffDays === 0 ? 'Due TODAY' : `Upcoming (${diffDays}d)` };
    } else {
      return { indicator: 'bg-emerald-500', badge: 'bg-emerald-950 text-emerald-400 border border-emerald-800', text: `On schedule (${diffDays}d)` };
    }
  };

  const filteredTasks = activeTab === 'All' ? tasks : tasks.filter((t) => t.category === activeTab);
  const sortedTasks = [...filteredTasks].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  const totalAmount = filteredTasks.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center shadow-md print:hidden">
        <TaskGuardLogo />
        <div className="flex items-center space-x-3">
          <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono font-bold text-emerald-400">
            Current View Total: ${totalAmount.toLocaleString()} USD
          </div>
          <button
            onClick={handlePrintReport}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
          >
            🖨️ Print / Report
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
          >
            + New Obligation / Task
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Quick Category Filters */}
          <div className="flex flex-wrap items-center justify-between mb-6 gap-2 print:hidden">
            <div className="flex space-x-2">
              {(['All', 'Business (BH)', 'Clinical', 'Administrative', 'Personal'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition shadow cursor-pointer ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {tab}{' '}
                  {tab === 'All'
                    ? `(${tasks.length})`
                    : `(${tasks.filter((t) => t.category === tab).length})`}
                </button>
              ))}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Showing: <span className="text-emerald-400 font-bold">{filteredTasks.length}</span> records
            </div>
          </div>

          {/* Table List */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
            <div className="grid grid-cols-12 bg-slate-800/90 px-4 py-3 border-b border-slate-700 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-3">Item / Obligation</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-2 text-right">Amount / Balance</div>
              <div className="col-span-1">Due Date</div>
              <div className="col-span-3 text-center">Actions & Installments</div>
            </div>

            <div className="divide-y divide-slate-700/60">
              {sortedTasks.map((task) => {
                const traffic = getTrafficLightStatus(task);
                const totalPaid = task.installments.reduce((sum, i) => sum + i.amount, 0);
                const remaining = Math.max(0, task.amount - totalPaid);

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
                          task.category === 'Business (BH)'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : task.category === 'Clinical'
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

                    <div className="col-span-2 text-right font-mono">
                      <span className="text-emerald-400 font-bold">${task.amount} USD</span>
                      {task.installments.length > 0 && (
                        <span className="block text-[10px] text-amber-400 font-semibold">
                          Remaining: ${remaining} USD
                        </span>
                      )}
                    </div>

                    <div className="col-span-1">
                      <span className="font-mono font-semibold text-slate-200 block text-xs">{task.due_date}</span>
                      <span className={`inline-block font-bold px-1.5 py-0.5 rounded text-[10px] mt-1 ${traffic.badge}`}>
                        {traffic.text}
                      </span>
                    </div>

                    {/* Actions: View, Pay Installment, Edit, Delete */}
                    <div className="col-span-3 flex justify-end items-center space-x-1.5 print:hidden">
                      <button
                        onClick={() => setViewingTask(task)}
                        className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] font-bold rounded border border-slate-600 transition cursor-pointer"
                        title="View complete details and payment history"
                      >
                        👁️ View
                      </button>

                      <button
                        onClick={() => openPaymentModal(task)}
                        className={`px-2 py-1.5 text-white text-[10px] font-bold rounded shadow transition cursor-pointer ${
                          task.status === 'Paid'
                            ? 'bg-blue-600 hover:bg-blue-500'
                            : 'bg-emerald-600 hover:bg-emerald-500'
                        }`}
                        title="Record partial installment or complete payment"
                      >
                        💳 {task.status === 'Paid' ? 'Paid / Add' : 'Pay Installment'}
                      </button>

                      <button
                        onClick={() => openEditModal(task)}
                        className="px-2 py-1.5 bg-sky-950 hover:bg-sky-900 text-sky-300 text-[10px] font-bold rounded border border-sky-800 transition cursor-pointer"
                        title="Edit entry"
                      >
                        ✏️ Edit
                      </button>

                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="px-2 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 text-[10px] font-bold rounded border border-rose-800 transition cursor-pointer"
                        title="Delete entry"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Installment Payment Modal */}
          {paymentModalTask && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 z-50 print:hidden">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                  <h3 className="text-base font-bold text-white">💳 Record Partial Payment / Installment</h3>
                  <button onClick={() => setPaymentModalTask(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
                </div>

                <div className="bg-slate-900 p-3 rounded border border-slate-700 text-xs space-y-1">
                  <p className="text-white font-bold">{paymentModalTask.title}</p>
                  <p className="text-slate-400">Total Obligation Amount: <span className="text-emerald-400 font-mono font-bold">${paymentModalTask.amount} USD</span></p>
                  <p className="text-slate-400">Total Already Paid: <span className="text-amber-400 font-mono font-bold">${paymentModalTask.installments.reduce((s, i) => s + i.amount, 0)} USD</span></p>
                  <p className="text-slate-400">Actual Remaining Balance: <span className="text-rose-400 font-mono font-bold">${Math.max(0, paymentModalTask.amount - paymentModalTask.installments.reduce((s, i) => s + i.amount, 0))} USD</span></p>
                </div>

                <form onSubmit={handleRegisterInstallment} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Installment Amount to Pay ($ USD)</label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono focus:outline-none focus:border-blue-500"
                      required
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Payment Date</label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Next Installment / Renewal Due Date (if applicable)</label>
                    <input
                      type="date"
                      value={nextDueDate}
                      onChange={(e) => setNextDueDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setPaymentModalTask(null)}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded cursor-pointer"
                    >
                      Save Installment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Quick View Modal (Eye & Installments History) */}
          {viewingTask && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 z-50 print:hidden">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-lg shadow-2xl space-y-4 text-xs">
                <div className="flex justify-between items-start border-b border-slate-700 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                      {viewingTask.category}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1">{viewingTask.title}</h3>
                  </div>
                  <button onClick={() => setViewingTask(null)} className="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
                </div>

                <p className="text-slate-300 bg-slate-900 p-3 rounded border border-slate-700">
                  {viewingTask.description || 'No additional notes provided.'}
                </p>

                {/* Installments History Breakdown */}
                <div className="bg-slate-900 p-3 rounded border border-slate-700 space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-amber-400 uppercase tracking-wider text-[10px]">
                      Installments & Payments History:
                    </h4>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold">
                      Total Paid: ${viewingTask.installments.reduce((sum, inst) => sum + inst.amount, 0)} / ${viewingTask.amount} USD
                    </span>
                  </div>

                  {viewingTask.installments.length === 0 ? (
                    <p className="text-slate-500 italic">No partial installments recorded yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {viewingTask.installments.map((inst, idx) => (
                        <div key={inst.id} className="flex justify-between items-center bg-slate-800 p-2 rounded border border-slate-700">
                          <span className="text-slate-300">
                            Installment #{idx + 1} - Date: <strong className="font-mono text-white">{inst.date}</strong>
                          </span>
                          <span className="text-emerald-400 font-mono font-bold">+${inst.amount} USD</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Remaining Balance to Pay:</span>
                    <span className="text-rose-400 font-mono font-bold">
                      ${Math.max(0, viewingTask.amount - viewingTask.installments.reduce((sum, inst) => sum + inst.amount, 0))} USD
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button onClick={() => setViewingTask(null)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded cursor-pointer">
                    Close View
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create / Edit Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 z-50 print:hidden">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
                <h3 className="text-base font-bold text-white mb-4">
                  {editingTask ? '✏️ Edit Obligation or Task' : '➕ New Obligation or Task'}
                </h3>
                <form onSubmit={handleSaveTask} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Title / Concept</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Rent Installment / iFax"
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1">Category</label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none"
                      >
                        <option value="Business (BH)">Business (Blessing Hands)</option>
                        <option value="Administrative">Administrative / Home</option>
                        <option value="Clinical">Clinical</option>
                        <option value="Personal">Personal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Total Amount ($ USD)</label>
                      <input
                        type="number"
                        value={formAmount}
                        onChange={(e) => setFormAmount(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1">Due Date / Cutoff</label>
                      <input
                        type="date"
                        value={formDueDate}
                        onChange={(e) => setFormDueDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Priority</label>
                      <select
                        value={formPriority}
                        onChange={(e) => setFormPriority(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none"
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Description / Notes</label>
                    <textarea
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none"
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
                      <span>Automatic Monthly Renewal</span>
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
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded cursor-pointer"
                    >
                      {editingTask ? 'Save Changes' : 'Save Obligation'}
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
