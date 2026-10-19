import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

export interface Task {
  id: string;
  title: string;
  description: string;
  category: 'Clinical' | 'Administrative' | 'Personal' | 'Business (BH)';
  priority: 'High' | 'Medium' | 'Low';
  amount: number;
  status: 'Pending' | 'Paid' | 'In Progress';
  phi_flag: boolean;
  bot_access: boolean;
  due_date: string; // YYYY-MM-DD
  recurring_monthly: boolean;
}

export default function TaskGuardDashboard() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'ChatGPT (Blessing Hands)',
      description: 'Corporate monthly AI subscription for operations and documentation.',
      category: 'Business (BH)',
      priority: 'High',
      amount: 55,
      status: 'Pending',
      phi_flag: false,
      bot_access: true,
      due_date: '2026-10-16',
      recurring_monthly: true,
    },
    {
      id: '2',
      title: 'Laboratory Results Review - Patient A',
      description: 'Review critical panel values in clinical office and adjust medication dosage.',
      category: 'Clinical',
      priority: 'High',
      amount: 0,
      status: 'Pending',
      phi_flag: true, // Protected Health Information
      bot_access: false,
      due_date: '2026-10-15',
      recurring_monthly: false,
    },
    {
      id: '3',
      title: 'Rent / Mortgage (Home)',
      description: 'Monthly residential mortgage payment.',
      category: 'Administrative',
      priority: 'High',
      amount: 1300,
      status: 'Pending',
      phi_flag: false,
      bot_access: false,
      due_date: '2026-10-30',
      recurring_monthly: true,
    },
    {
      id: '4',
      title: 'BH Cell Phone (Blessing Hands)',
      description: 'Corporate mobile phone service line for BH staff.',
      category: 'Business (BH)',
      priority: 'High',
      amount: 9,
      status: 'Pending',
      phi_flag: false,
      bot_access: true,
      due_date: '2026-10-19',
      recurring_monthly: true,
    },
    {
      id: '5',
      title: 'iFax (Blessing Hands)',
      description: 'HIPAA-compliant cloud medical fax service subscription.',
      category: 'Business (BH)',
      priority: 'High',
      amount: 55,
      status: 'Pending',
      phi_flag: false,
      bot_access: true,
      due_date: '2026-10-24',
      recurring_monthly: true,
    },
  ]);

  // Active Category Filter
  const [activeTab, setActiveTab] = useState<'All' | 'Business (BH)' | 'Clinical' | 'Administrative' | 'Personal'>('All');

  // Modals States
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form inputs
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState<'Clinical' | 'Administrative' | 'Personal' | 'Business (BH)'>('Business (BH)');
  const [formPriority, setFormPriority] = useState<'High' | 'Medium' | 'Low'>('High');
  const [formAmount, setFormAmount] = useState(0);
  const [formDueDate, setFormDueDate] = useState('');
  const [formRecurring, setFormRecurring] = useState(true);
  const [formPhi, setFormPhi] = useState(false);

  // Realtime Supabase Sync
  useEffect(() => {
    fetchFromSupabase();

    const channel = supabase
      .channel('schema-db-changes-v9-en')
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
            // Normalizar categorías al inglés
            let cat: Task['category'] = 'Business (BH)';
            if (t.category === 'Clinica' || t.category === 'Clinical') cat = 'Clinical';
            else if (t.category === 'Administrativa' || t.category === 'Administrative') cat = 'Administrative';
            else if (t.category === 'Personal') cat = 'Personal';

            let prio: Task['priority'] = 'High';
            if (t.priority === 'Media' || t.quadrant === 'not_urgent_important') prio = 'Medium';
            else if (t.priority === 'Baja' || t.quadrant === 'not_urgent_not_important') prio = 'Low';

            return {
              id: t.id,
              title: t.title,
              description: t.description || '',
              category: cat,
              priority: prio,
              amount: Number(t.amount || 0),
              status: t.status === 'completed' || t.status === 'Paid' || t.status === 'Pagado' ? 'Paid' : t.status === 'in_progress' ? 'In Progress' : 'Pending',
              phi_flag: !!t.phi_flag,
              bot_access: t.bot_access !== undefined ? !!t.bot_access : !t.phi_flag,
              due_date: t.due_date ? t.due_date.substring(0, 10) : '2026-10-20',
              recurring_monthly: t.recurring_monthly !== undefined ? !!t.recurring_monthly : true,
            };
          })
        );
      }
    } catch (e) {
      console.warn('Using local reactive state:', e);
    }
  };

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
          console.warn('Error updating Supabase:', err);
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
          },
        ]);
      } catch (err) {
        console.warn('Error saving to Supabase:', err);
      }
    }
    setShowAddModal(false);
  };

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
            status: 'Paid',
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
        console.warn('Error syncing renewal:', err);
      }
    }
  };

  const handleDeleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (id.length > 20) {
      try {
        await supabase.from('tasks').delete().eq('id', id);
      } catch (err) {
        console.warn('Error deleting record:', err);
      }
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  // Visual Traffic Light / Countdown Status
  const getTrafficLightStatus = (dueDateStr: string, priority: string, status: string) => {
    if (status === 'Paid') {
      return { indicator: 'bg-blue-500', badge: 'bg-blue-950 text-blue-400 border border-blue-800', text: 'Paid (Renewed)' };
    }
    const today = new Date('2026-10-19');
    const dueDate = new Date(dueDateStr);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0 || priority === 'High') {
      return { indicator: 'bg-rose-500 animate-pulse', badge: 'bg-rose-950 text-rose-400 border border-rose-800', text: diffDays < 0 ? `Overdue (${Math.abs(diffDays)}d)` : 'Critical' };
    } else if (diffDays <= 3 || priority === 'Medium') {
      return { indicator: 'bg-amber-500', badge: 'bg-amber-950 text-amber-400 border border-amber-800', text: diffDays === 0 ? 'Due TODAY' : `Upcoming (${diffDays}d)` };
    } else {
      return { indicator: 'bg-emerald-500', badge: 'bg-emerald-950 text-emerald-400 border border-emerald-800', text: `On schedule (${diffDays}d)` };
    }
  };

  // Filter & Sort
  const filteredTasks = activeTab === 'All' ? tasks : tasks.filter((t) => t.category === activeTab);
  const sortedTasks = [...filteredTasks].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  const totalAmount = filteredTasks.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center shadow-md print:hidden">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-600 text-white p-2 rounded-lg font-bold tracking-wider text-sm shadow-md">TG</div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">TaskGuard Desktop - Home & Blessing Hands (BH)</h1>
            <p className="text-xs text-slate-400">Financial Control, Activities & HIPAA/PHI Security Priority Engine</p>
          </div>
        </div>
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
          {/* Quick Category Filter Pills */}
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

          {/* List Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
            <div className="grid grid-cols-12 bg-slate-800/90 px-4 py-3 border-b border-slate-700 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-3">Item / Obligation</div>
              <div className="col-span-2">Category & BH</div>
              <div className="col-span-1 text-right">Amount</div>
              <div className="col-span-2">Due Date</div>
              <div className="col-span-3 text-center">Actions (View, Edit, Pay)</div>
            </div>

            <div className="divide-y divide-slate-700/60">
              {sortedTasks.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No records registered in this category.
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
                            task.category === 'Business (BH)'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : task.category === 'Clinical'
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : 'bg-blue-950 text-blue-300 border border-blue-800'
                          }`}
                        >
                          {task.category}
                        </span>
                        {task.recurring_monthly && (
                          <span className="text-[9px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded w-fit font-mono">
                            🔄 Monthly
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

                      {/* Actions: View, Pay, Edit, Delete */}
                      <div className="col-span-3 flex justify-end items-center space-x-1.5 print:hidden">
                        <button
                          onClick={() => setViewingTask(task)}
                          className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] font-bold rounded border border-slate-600 transition cursor-pointer"
                          title="View complete details"
                        >
                          👁️ View
                        </button>

                        {task.status !== 'Paid' ? (
                          <button
                            onClick={() => handleMarkAsPaidAndRenew(task.id)}
                            className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded shadow transition cursor-pointer"
                            title="Pay and advance one month"
                          >
                            ✔ Pay
                          </button>
                        ) : (
                          <span className="text-blue-400 text-[9px] font-bold bg-blue-950 px-1.5 py-1 rounded border border-blue-800">
                            Paid
                          </span>
                        )}

                        <button
                          onClick={() => openEditModal(task)}
                          className="px-2 py-1.5 bg-sky-950 hover:bg-sky-900 text-sky-300 text-[10px] font-bold rounded border border-sky-800 transition cursor-pointer"
                          title="Edit details or amounts"
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
                })
              )}
            </div>
          </div>

          {/* Quick View Modal (Eye) */}
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
                    <span className="text-slate-400 block font-semibold mb-1">Description / Notes:</span>
                    <p className="text-slate-200 bg-slate-900 p-3 rounded border border-slate-700">
                      {viewingTask.description || 'No additional notes provided.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900 p-2.5 rounded border border-slate-700">
                      <span className="text-slate-400 block text-[10px]">Financial Amount:</span>
                      <span className="text-emerald-400 font-mono font-bold text-sm">
                        ${viewingTask.amount} USD
                      </span>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded border border-slate-700">
                      <span className="text-slate-400 block text-[10px]">Due Date:</span>
                      <span className="text-slate-200 font-mono font-bold text-sm">
                        {viewingTask.due_date}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900 p-2.5 rounded border border-slate-700">
                      <span className="text-slate-400 block text-[10px]">Assigned Priority:</span>
                      <span className="text-amber-400 font-bold">{viewingTask.priority}</span>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded border border-slate-700">
                      <span className="text-slate-400 block text-[10px]">Monthly Auto-Renewal:</span>
                      <span className="text-blue-400 font-bold">
                        {viewingTask.recurring_monthly ? 'Yes (Automatic)' : 'No'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-3 rounded border border-slate-700 flex justify-between items-center">
                    <div>
                      <span className="text-slate-400 block text-[10px]">HIPAA Privacy & Security:</span>
                      <span
                        className={viewingTask.phi_flag ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}
                      >
                        {viewingTask.phi_flag ? '🔒 Protected Health Information (PHI)' : 'Standard / Public'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Bot Access (Dots / Musa):</span>
                      <span
                        className={viewingTask.bot_access ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}
                      >
                        {viewingTask.bot_access ? '✔ Permitted' : '✖ Blocked (Private)'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setViewingTask(null)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded cursor-pointer"
                  >
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
                <form onSubmit={handleSaveTask} className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Title / Concept</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. iFax (Blessing Hands)"
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Category</label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white focus:outline-none"
                      >
                        <option value="Business (BH)">Business (Blessing Hands)</option>
                        <option value="Administrative">Administrative / Home</option>
                        <option value="Clinical">Clinical</option>
                        <option value="Personal">Personal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Amount ($ USD)</label>
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
                      <label className="block text-xs text-slate-400 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={formDueDate}
                        onChange={(e) => setFormDueDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Priority</label>
                      <select
                        value={formPriority}
                        onChange={(e) => setFormPriority(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white focus:outline-none"
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Description / Notes</label>
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
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded cursor-pointer"
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
