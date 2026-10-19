import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { TaskGuardLogo } from './components/TaskGuardLogo';

export interface Installment {
  id: string;
  date: string;
  amount: number;
}

export interface Item {
  id: string;
  type: 'Task' | 'Bill'; // SEPARACIÓN CLAVE: Activity vs Bill
  title: string;
  description: string;
  category: 'Clinical' | 'Administrative' | 'Personal' | 'Business (BH)';
  priority: 'High' | 'Medium' | 'Low';
  amount: number; // Solo aplica para Bills
  status: 'Pending' | 'Partial' | 'Paid' | 'Completed';
  phi_flag: boolean;
  bot_access: boolean;
  due_date: string;
  recurring_monthly: boolean;
  installments: Installment[];
}

export default function TaskGuardDashboard() {
  const [items, setItems] = useState<Item[]>([
    {
      id: '1',
      type: 'Bill',
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
      id: '2',
      type: 'Task',
      title: 'Laboratory Results Review - Patient A',
      description: 'Review critical panel values in clinical office and adjust medication.',
      category: 'Clinical',
      priority: 'High',
      amount: 0,
      status: 'Pending',
      phi_flag: true, // HIPAA / PHI
      bot_access: false,
      due_date: '2026-10-15',
      recurring_monthly: false,
      installments: [],
    },
    {
      id: '3',
      type: 'Bill',
      title: 'Rent / Mortgage (Home)',
      description: 'Monthly residential mortgage payment.',
      category: 'Administrative',
      priority: 'High',
      amount: 1300,
      status: 'Partial',
      phi_flag: false,
      bot_access: false,
      due_date: '2026-10-30',
      recurring_monthly: true,
      installments: [
        { id: 'inst-1', date: '2026-10-01', amount: 650 },
      ],
    },
    {
      id: '4',
      type: 'Bill',
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
      id: '5',
      type: 'Bill',
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
  const [typeFilter, setTypeFilter] = useState<'All' | 'Task' | 'Bill'>('All'); // Filtro entre Tareas y Facturas

  // Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [paymentModalItem, setPaymentModalItem] = useState<Item | null>(null);
  const [viewingItem, setViewingItem] = useState<Item | null>(null);

  // Campos para abono de cuotas
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [nextDueDate, setNextDueDate] = useState('');

  // Campos del formulario
  const [formType, setFormType] = useState<'Task' | 'Bill'>('Bill');
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
      .channel('schema-db-changes-v11-tasks-bills')
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
      const { data: dbItems } = await supabase.from('tasks').select('*');
      if (dbItems && dbItems.length > 0) {
        setItems(
          dbItems.map((t) => {
            let cat: Item['category'] = 'Business (BH)';
            if (t.category === 'Clinica' || t.category === 'Clinical') cat = 'Clinical';
            else if (t.category === 'Administrativa' || t.category === 'Administrative') cat = 'Administrative';
            else if (t.category === 'Personal') cat = 'Personal';

            let prio: Item['priority'] = 'High';
            if (t.priority === 'Media' || t.quadrant === 'not_urgent_important') prio = 'Medium';
            else if (t.priority === 'Baja' || t.quadrant === 'not_urgent_not_important') prio = 'Low';

            let stat: Item['status'] = 'Pending';
            if (t.status === 'completed' || t.status === 'Completed' || t.status === 'Completada') stat = 'Completed';
            else if (t.status === 'Paid' || t.status === 'Pagado') stat = 'Paid';
            else if (t.status === 'Partial' || t.status === 'Parcial') stat = 'Partial';

            const itemType: 'Task' | 'Bill' = t.type === 'Task' ? 'Task' : (t.amount > 0 || t.recurring_monthly ? 'Bill' : 'Task');
            const instList: Installment[] = Array.isArray(t.installments) ? t.installments : [];

            return {
              id: t.id,
              type: itemType,
              title: t.title,
              description: t.description || '',
              category: cat,
              priority: prio,
              amount: Number(t.amount || 0),
              status: stat,
              phi_flag: !!t.phi_flag,
              bot_access: t.bot_access !== undefined ? !!t.bot_access : !t.phi_flag,
              due_date: t.due_date ? t.due_date.substring(0, 10) : '2026-10-20',
              recurring_monthly: t.recurring_monthly !== undefined ? !!t.recurring_monthly : false,
              installments: instList,
            };
          })
        );
      }
    } catch (e) {
      console.warn('Using local reactive state:', e);
    }
  };

  // Abrir modal de pago para Bills
  const openPaymentModal = (item: Item) => {
    setPaymentModalItem(item);
    const totalPaidSoFar = item.installments.reduce((sum, inst) => sum + inst.amount, 0);
    const remainingBalance = Math.max(0, item.amount - totalPaidSoFar);
    setPaymentAmount(remainingBalance > 0 ? remainingBalance : item.amount);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setNextDueDate(item.due_date);
  };

  // Registrar abono de cuota para Bill
  const handleRegisterInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalItem || paymentAmount <= 0) return;

    const newInstallment: Installment = {
      id: Date.now().toString(),
      date: paymentDate,
      amount: Number(paymentAmount),
    };

    const updatedInstallments = [...paymentModalItem.installments, newInstallment];
    const totalPaidSoFar = updatedInstallments.reduce((sum, i) => sum + i.amount, 0);
    const isFullyPaid = totalPaidSoFar >= paymentModalItem.amount;

    let targetDueDate = paymentModalItem.due_date;
    if (isFullyPaid && paymentModalItem.recurring_monthly && nextDueDate) {
      targetDueDate = nextDueDate;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === paymentModalItem.id) {
          return {
            ...item,
            status: isFullyPaid ? 'Paid' : 'Partial',
            installments: updatedInstallments,
            due_date: targetDueDate,
          };
        }
        return item;
      })
    );

    if (paymentModalItem.id.length > 20) {
      try {
        await supabase
          .from('tasks')
          .update({
            status: isFullyPaid ? 'Paid' : 'Partial',
            installments: updatedInstallments,
            due_date: new Date(targetDueDate).toISOString(),
          })
          .eq('id', paymentModalItem.id);

        await supabase.from('bot_audit_logs').insert([
          {
            bot_name: 'Financial-Operator',
            action_type: isFullyPaid ? 'FULL_BILL_PAID' : 'BILL_INSTALLMENT_PAID',
            task_id: paymentModalItem.id,
            accessed_phi: false,
            event_details: {
              amount_paid: Number(paymentAmount),
              payment_date: paymentDate,
              total_paid_so_far: totalPaidSoFar,
              remaining: Math.max(0, paymentModalItem.amount - totalPaidSoFar),
            },
            ip_address: '127.0.0.1',
          },
        ]);
      } catch (err) {
        console.warn('Error syncing installment in Supabase:', err);
      }
    }

    setPaymentModalItem(null);
  };

  // Marcar Actividad (Task) como completada
  const handleToggleTaskComplete = async (id: string) => {
    let nextStatus: Item['status'] = 'Completed';

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          nextStatus = item.status === 'Completed' ? 'Pending' : 'Completed';
          return {
            ...item,
            status: nextStatus,
          };
        }
        return item;
      })
    );

    if (id.length > 20) {
      try {
        await supabase
          .from('tasks')
          .update({ status: nextStatus === 'Completed' ? 'completed' : 'todo' })
          .eq('id', id);
      } catch (err) {
        console.warn('Error toggling task status:', err);
      }
    }
  };

  // Guardar nuevo registro (Task o Bill)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDueDate) return;

    const newItem: Item = {
      id: Date.now().toString(),
      type: formType,
      title: formTitle,
      description: formDesc,
      category: formCategory,
      priority: formPriority,
      amount: formType === 'Bill' ? Number(formAmount) : 0,
      status: 'Pending',
      phi_flag: formPhi,
      bot_access: formCategory !== 'Clinical',
      due_date: formDueDate,
      recurring_monthly: formType === 'Bill' ? formRecurring : false,
      installments: [],
    };

    setItems((prev) => [...prev, newItem]);
    setShowAddModal(false);

    try {
      await supabase.from('tasks').insert([
        {
          type: newItem.type,
          title: newItem.title,
          description: newItem.description,
          category: newItem.category,
          amount: newItem.amount,
          recurring_monthly: newItem.recurring_monthly,
          phi_flag: newItem.phi_flag,
          bot_access: newItem.bot_access,
          due_date: new Date(newItem.due_date).toISOString(),
          installments: [],
        },
      ]);
    } catch (err) {
      console.warn('Error saving in Supabase:', err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
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
  const getTrafficLightStatus = (item: Item) => {
    if (item.status === 'Paid' || item.status === 'Completed') {
      return {
        indicator: 'bg-blue-500',
        badge: 'bg-blue-950 text-blue-400 border border-blue-800',
        text: item.type === 'Bill' ? 'Fully Paid' : 'Completed',
      };
    }
    if (item.status === 'Partial') {
      return {
        indicator: 'bg-amber-500',
        badge: 'bg-amber-950 text-amber-400 border border-amber-800',
        text: 'Partial / Installments',
      };
    }
    const today = new Date('2026-10-19');
    const dueDate = new Date(item.due_date);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0 || item.priority === 'High') {
      return {
        indicator: 'bg-rose-500 animate-pulse',
        badge: 'bg-rose-950 text-rose-400 border border-rose-800',
        text: diffDays < 0 ? `Overdue (${Math.abs(diffDays)}d)` : 'Critical / High',
      };
    } else {
      return {
        indicator: 'bg-emerald-500',
        badge: 'bg-emerald-950 text-emerald-400 border border-emerald-800',
        text: `On schedule (${diffDays}d)`,
      };
    }
  };

  // Filtrado combinado: Categoría + Tipo (Task vs Bill)
  const filteredItems = items.filter((item) => {
    const matchesCategory = activeTab === 'All' || item.category === activeTab;
    const matchesType = typeFilter === 'All' || item.type === typeFilter;
    return matchesCategory && matchesType;
  });

  const sortedItems = [...filteredItems].sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );

  const totalAmount = filteredItems
    .filter((i) => i.type === 'Bill')
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center shadow-md print:hidden">
        <TaskGuardLogo />
        <div className="flex items-center space-x-3">
          <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono font-bold text-emerald-400">
            Bills Total: ${totalAmount.toLocaleString()} USD
          </div>
          <button
            onClick={handlePrintReport}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
          >
            🖨️ Print / Report
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
          >
            + New Record
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Quick Filters: Categories + Type Selector */}
          <div className="flex flex-wrap items-center justify-between mb-6 gap-3 print:hidden">
            {/* Category Pills */}
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
                    ? `(${items.length})`
                    : `(${items.filter((t) => t.category === tab).length})`}
                </button>
              ))}
            </div>

            {/* TYPE FILTER: ALL vs ACTIVITIES (TASKS) vs BILLS */}
            <div className="flex space-x-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
              <button
                onClick={() => setTypeFilter('All')}
                className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                  typeFilter === 'All' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({items.length})
              </button>
              <button
                onClick={() => setTypeFilter('Task')}
                className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                  typeFilter === 'Task' ? 'bg-purple-900 text-purple-200' : 'text-slate-400 hover:text-purple-300'
                }`}
              >
                📋 Activities ({items.filter((i) => i.type === 'Task').length})
              </button>
              <button
                onClick={() => setTypeFilter('Bill')}
                className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                  typeFilter === 'Bill' ? 'bg-emerald-900 text-emerald-200' : 'text-slate-400 hover:text-emerald-300'
                }`}
              >
                💳 Bills & Payments ({items.filter((i) => i.type === 'Bill').length})
              </button>
            </div>
          </div>

          {/* Table List */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
            {/* Table Header with proper column spacing */}
            <div className="grid grid-cols-12 bg-slate-850 px-4 py-3 border-b border-slate-700 text-[11px] font-bold text-slate-400 uppercase tracking-wider items-center gap-2">
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-3">Item / Activity or Bill</div>
              <div className="col-span-2">Type & Category</div>
              <div className="col-span-2 text-right pr-3 border-r border-slate-700/60">Amount</div>
              <div className="col-span-2 pl-3">Due Date</div>
              <div className="col-span-2 text-center">Actions & Management</div>
            </div>

            <div className="divide-y divide-slate-700/60">
              {sortedItems.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No records matching the selected filters.
                </div>
              ) : (
                sortedItems.map((item) => {
                  const traffic = getTrafficLightStatus(item);
                  const totalPaid = item.installments.reduce((sum, i) => sum + i.amount, 0);
                  const remaining = item.amount - totalPaid;

                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 px-4 py-3 items-center hover:bg-slate-750/70 transition text-xs gap-2"
                    >
                      <div className="col-span-1 flex justify-center items-center">
                        <span className={`w-3.5 h-3.5 rounded-full shadow-md ${traffic.indicator}`} title={traffic.text}></span>
                      </div>

                      <div className="col-span-3 pr-2">
                        <div className="flex items-center space-x-1.5 mb-0.5">
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                              item.type === 'Bill'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-purple-950 text-purple-300 border border-purple-800'
                            }`}
                          >
                            {item.type === 'Bill' ? '💳 Bill' : '📋 Activity'}
                          </span>
                          <h4 className="font-bold text-white text-sm truncate">{item.title}</h4>
                        </div>
                        <p className="text-slate-400 text-[11px] truncate">{item.description}</p>
                      </div>

                      <div className="col-span-2 flex flex-col space-y-1">
                        <span className="inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 w-fit">
                          {item.category}
                        </span>
                        {item.phi_flag && (
                          <span className="text-[9px] bg-rose-950 text-rose-400 border border-rose-800 px-1.5 py-0.5 rounded font-mono font-semibold w-fit">
                            🔒 HIPAA / PHI
                          </span>
                        )}
                      </div>

                      {/* AMOUNT COLUMN (Dedicated 2 cols, clearly separated) */}
                      <div className="col-span-2 text-right pr-3 border-r border-slate-700/60 font-mono">
                        {item.type === 'Bill' ? (
                          <div>
                            <span className="text-emerald-400 font-bold text-sm block">
                              ${item.amount.toLocaleString()}
                            </span>
                            {item.installments.length > 0 && (
                              <span className="block text-[10px] text-amber-400 font-medium">
                                Rem: ${remaining.toLocaleString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 font-normal text-xs">-</span>
                        )}
                      </div>

                      {/* DUE DATE COLUMN (Dedicated 2 cols with left padding) */}
                      <div className="col-span-2 pl-3">
                        <span className="font-mono font-semibold text-slate-200 block text-xs tracking-tight">
                          📅 {item.due_date}
                        </span>
                        <span className={`inline-block font-bold px-2 py-0.5 rounded text-[10px] mt-1 ${traffic.badge}`}>
                          {traffic.text}
                        </span>
                      </div>

                      {/* Tailored Actions: Bill vs Task */}
                      <div className="col-span-2 flex justify-end items-center space-x-1.5 print:hidden">
                        <button
                          onClick={() => setViewingItem(item)}
                          className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] font-bold rounded border border-slate-600 cursor-pointer"
                        >
                          👁️ View
                        </button>

                        {item.type === 'Bill' ? (
                          <button
                            onClick={() => openPaymentModal(item)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded shadow transition cursor-pointer"
                            title="Pay installment or full bill"
                          >
                            💳 Pay
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleTaskComplete(item.id)}
                            className={`px-2.5 py-1.5 text-[10px] font-bold rounded shadow transition cursor-pointer ${
                              item.status === 'Completed'
                                ? 'bg-blue-950 text-blue-400 border border-blue-800'
                                : 'bg-purple-600 hover:bg-purple-500 text-white'
                            }`}
                          >
                            {item.status === 'Completed' ? '✔ Done' : 'Mark Done'}
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="px-2 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 text-[10px] font-bold rounded border border-rose-800 cursor-pointer"
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

          {/* Payment Modal for Bills */}
          {paymentModalItem && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 z-50 print:hidden">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                  <h3 className="text-base font-bold text-white">💳 Pay Bill / Installment</h3>
                  <button onClick={() => setPaymentModalItem(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
                </div>

                <div className="bg-slate-900 p-3 rounded border border-slate-700 text-xs space-y-1">
                  <p className="text-white font-bold">{paymentModalItem.title}</p>
                  <p className="text-slate-400">Total Bill: <span className="text-emerald-400 font-mono font-bold">${paymentModalItem.amount} USD</span></p>
                  <p className="text-slate-400">Total Paid: <span className="text-amber-400 font-mono font-bold">${paymentModalItem.installments.reduce((s, i) => s + i.amount, 0)} USD</span></p>
                  <p className="text-slate-400">Remaining Balance: <span className="text-rose-400 font-mono font-bold">${Math.max(0, paymentModalItem.amount - paymentModalItem.installments.reduce((s, i) => s + i.amount, 0))} USD</span></p>
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
                    <label className="block text-slate-400 mb-1">Next Installment Due Date (if not fully paid)</label>
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
                      onClick={() => setPaymentModalItem(null)}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded cursor-pointer"
                    >
                      Save Payment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Quick View Details Modal */}
          {viewingItem && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 z-50 print:hidden">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-lg shadow-2xl space-y-4 text-xs">
                <div className="flex justify-between items-start border-b border-slate-700 pb-3">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                        viewingItem.type === 'Bill' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-purple-950 text-purple-300 border border-purple-800'
                      }`}>
                        {viewingItem.type === 'Bill' ? '💳 Bill' : '📋 Activity'}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                        {viewingItem.category}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white">{viewingItem.title}</h3>
                  </div>
                  <button onClick={() => setViewingItem(null)} className="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
                </div>

                <p className="text-slate-300 bg-slate-900 p-3 rounded border border-slate-700">
                  {viewingItem.description || 'No notes provided.'}
                </p>

                {viewingItem.type === 'Bill' && (
                  <div className="bg-slate-900 p-3 rounded border border-slate-700 space-y-2">
                    <h4 className="font-bold text-amber-400 uppercase tracking-wider text-[10px]">
                      Installments & Payment History:
                    </h4>
                    {viewingItem.installments.length === 0 ? (
                      <p className="text-slate-500 italic">No partial installments recorded yet.</p>
                    ) : (
                      viewingItem.installments.map((inst, idx) => (
                        <div key={inst.id} className="flex justify-between items-center bg-slate-800 p-2 rounded border border-slate-700">
                          <span className="text-slate-300">
                            Installment #{idx + 1} - Date: <strong className="font-mono text-white">{inst.date}</strong>
                          </span>
                          <span className="text-emerald-400 font-mono font-bold">+${inst.amount} USD</span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button onClick={() => setViewingItem(null)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded cursor-pointer">
                    Close View
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* New Record Modal (Task vs Bill) */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 z-50 print:hidden">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
                <h3 className="text-base font-bold text-white mb-4">➕ New Record (Activity or Bill)</h3>
                <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1">Record Type</label>
                      <select
                        value={formType}
                        onChange={(e) => setFormType(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-bold focus:outline-none"
                      >
                        <option value="Bill">💳 Payment Bill</option>
                        <option value="Task">📋 Activity / Task</option>
                      </select>
                    </div>
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
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Title / Concept</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-blue-500"
                      required
                      placeholder={formType === 'Bill' ? 'e.g. iFax or Rent Bill' : 'e.g. Review Patient Bloodwork'}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1">Due Date / Cutoff</label>
                      <input
                        type="date"
                        value={formDueDate}
                        onChange={(e) => setFormDueDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-blue-500"
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

                  {formType === 'Bill' && (
                    <div>
                      <label className="block text-slate-400 mb-1">Total Amount ($ USD)</label>
                      <input
                        type="number"
                        value={formAmount}
                        onChange={(e) => setFormAmount(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono focus:outline-none focus:border-blue-500"
                        required
                        min="1"
                      />
                    </div>
                  )}

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
                    {formType === 'Bill' && (
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formRecurring}
                          onChange={(e) => setFormRecurring(e.target.checked)}
                          className="rounded cursor-pointer"
                        />
                        <span>Automatic Monthly Renewal</span>
                      </label>
                    )}
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
                      Save Record
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
