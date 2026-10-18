import { useState, useEffect } from 'react';
import { 
  X, 
  ShieldAlert, 
  Clock, 
  Check, 
  Tag, 
  Layers
} from 'lucide-react';
import type { Task, EisenhowerQuadrant, TaskCategory, TaskStatus } from '../types/database';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Partial<Task>) => Promise<void>;
  initialTask?: Task | null;
}

export function TaskModal({ isOpen, onClose, onSave, initialTask }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quadrant, setQuadrant] = useState<EisenhowerQuadrant>('urgent_important');
  const [category, setCategory] = useState<TaskCategory>('Clinica');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [phiFlag, setPhiFlag] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setDescription(initialTask.description || '');
      setQuadrant(initialTask.quadrant);
      setCategory(initialTask.category || 'Clinica');
      setStatus(initialTask.status);
      setPhiFlag(initialTask.phi_flag);
      setDueDate(initialTask.due_date ? initialTask.due_date.substring(0, 16) : '');
    } else {
      setTitle('');
      setDescription('');
      setQuadrant('urgent_important');
      setCategory('Clinica');
      setStatus('todo');
      setPhiFlag(false);
      setDueDate('');
    }
  }, [initialTask, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        quadrant,
        category,
        status,
        phi_flag: phiFlag,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      });
      onClose();
    } catch (err) {
      console.error('Error al guardar la tarea:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'rgba(15, 23, 42, 0.95)',
          border: phiFlag ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid var(--border-subtle)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ENCABEZADO */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: phiFlag ? 'rgba(244, 63, 94, 0.08)' : 'transparent',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f8fafc' }}>
              {initialTask ? 'Editar Actividad Médica' : 'Nueva Tarea Priorizada'}
            </h3>
            {phiFlag && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  backgroundColor: 'var(--color-phi-bg)',
                  color: 'var(--color-phi)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid rgba(244, 63, 94, 0.4)',
                }}
              >
                HIPAA / PHI
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              borderRadius: '6px',
              padding: '4px',
              display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* TÍTULO */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              TÍTULO DE LA TAREA *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Revisión preoperatoria paciente #482"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {/* DESCRIPCIÓN */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              DESCRIPCIÓN Y DETALLES
            </label>
            <textarea
              rows={3}
              placeholder="Indicaciones clínicas, notas o contexto operativo..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                fontSize: '13px',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* CUADRANTE & CATEGORÍA */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                <Layers size={14} /> CUADRANTE EISENHOWER
              </label>
              <select
                value={quadrant}
                onChange={(e) => setQuadrant(e.target.value as EisenhowerQuadrant)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  background: '#1e293b',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none',
                }}
              >
                <option value="urgent_important">Q1: Crítico (Hacer ya)</option>
                <option value="not_urgent_important">Q2: Estratégico (Agendar)</option>
                <option value="urgent_not_important">Q3: Delegar (Interrupciones)</option>
                <option value="not_urgent_not_important">Q4: Descartar (Baja)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                <Tag size={14} /> CATEGORÍA
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  background: '#1e293b',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none',
                }}
              >
                <option value="Clinica">Clínica</option>
                <option value="Administrativa">Administrativa</option>
                <option value="Personal">Personal</option>
              </select>
            </div>
          </div>

          {/* FECHA LÍMITE & ESTADO */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                <Clock size={14} /> FECHA Y HORA LÍMITE
              </label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                ESTADO DE EJECUCIÓN
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  background: '#1e293b',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none',
                }}
              >
                <option value="todo">Pendiente (Por hacer)</option>
                <option value="in_progress">En Progreso</option>
                <option value="completed">Completada</option>
                <option value="archived">Archivada</option>
              </select>
            </div>
          </div>

          {/* SWITCH DE SEGURIDAD PHI / HIPAA */}
          <div
            style={{
              padding: '14px',
              borderRadius: '10px',
              background: phiFlag ? 'rgba(244, 63, 94, 0.12)' : 'rgba(255, 255, 255, 0.03)',
              border: phiFlag ? '1px solid rgba(244, 63, 94, 0.35)' : '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldAlert size={20} style={{ color: phiFlag ? 'var(--color-phi)' : 'var(--text-dim)' }} />
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: phiFlag ? '#fecdd3' : '#f8fafc' }}>
                  Bandera PHI (Protected Health Information)
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Activar si la tarea contiene nombres de pacientes, historiales o datos sensibles bajo norma HIPAA.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPhiFlag(!phiFlag)}
              style={{
                width: '46px',
                height: '24px',
                borderRadius: '12px',
                backgroundColor: phiFlag ? 'var(--color-phi)' : '#334155',
                position: 'relative',
                padding: '2px',
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#fff',
                  transform: phiFlag ? 'translateX(22px)' : 'translateX(0px)',
                  transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </button>
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                background: 'rgba(255, 255, 255, 0.05)',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '10px 22px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#fff',
                background: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Check size={16} /> {isSubmitting ? 'Guardando...' : initialTask ? 'Actualizar' : 'Crear Tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
