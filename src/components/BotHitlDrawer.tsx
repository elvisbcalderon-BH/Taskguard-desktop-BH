import { 
  Bot, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  X,
  FileText
} from 'lucide-react';
import type { BotAuthorization } from '../types/database';

interface BotHitlDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  authorizations: BotAuthorization[];
  onResolve: (id: string, approve: boolean, rejectionReason?: string) => Promise<void>;
  loadingId?: string | null;
}

export function BotHitlDrawer({
  isOpen,
  onClose,
  authorizations,
  onResolve,
  loadingId,
}: BotHitlDrawerProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 900,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '480px',
          height: '100%',
          borderRadius: 0,
          borderLeft: '1px solid var(--border-subtle)',
          background: 'rgba(11, 17, 33, 0.98)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(139, 92, 246, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(139, 92, 246, 0.25)',
                color: 'var(--accent-dots)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bot size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                  Cola de Bots HITL
                </h3>
                {authorizations.length > 0 && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      backgroundColor: '#ef4444',
                      color: '#fff',
                      padding: '1px 7px',
                      borderRadius: '10px',
                    }}
                  >
                    {authorizations.length}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Revisión humana obligatoria antes de ingresar a la base médica
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              borderRadius: '6px',
              padding: '6px',
              display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* LISTA DE SOLICITUDES PENDIENTES */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {authorizations.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-muted)',
                textAlign: 'center',
                gap: '12px',
              }}
            >
              <CheckCircle2 size={44} style={{ color: '#10b981' }} />
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>Cola Despejada</h4>
                <p style={{ fontSize: '12px', marginTop: '4px', maxWidth: '280px' }}>
                  Ni Dots ni Musa tienen solicitudes pendientes de autorización en este momento.
                </p>
              </div>
            </div>
          ) : (
            authorizations.map((auth) => (
              <div
                key={auth.id}
                className="glass-panel"
                style={{
                  padding: '18px',
                  borderRadius: '12px',
                  borderLeft: auth.phi_risk_detected
                    ? '4px solid var(--color-phi)'
                    : '4px solid #3b82f6',
                  background: 'rgba(255, 255, 255, 0.02)',
                }}
              >
                {/* IDENTIFICADOR BOT */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor:
                        auth.bot_name === 'Dots'
                          ? 'rgba(139, 92, 246, 0.2)'
                          : 'rgba(6, 182, 212, 0.2)',
                      color:
                        auth.bot_name === 'Dots' ? 'var(--accent-dots)' : 'var(--accent-musa)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    ORIGEN: {auth.bot_name.toUpperCase()}
                  </span>

                  {auth.phi_risk_detected && (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '10px',
                        fontWeight: 800,
                        backgroundColor: 'var(--color-phi-bg)',
                        color: 'var(--color-phi)',
                        padding: '2px 7px',
                        borderRadius: '4px',
                      }}
                    >
                      <ShieldAlert size={12} /> PHI SENSIBLE
                    </span>
                  )}
                </div>

                {/* CONTENIDO SOLICITADO */}
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', lineHeight: 1.4 }}>
                  {auth.requested_payload.title || 'Solicitud sin título'}
                </h4>
                {auth.requested_payload.description && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                    {auth.requested_payload.description}
                  </p>
                )}

                {/* METADATOS SUGERIDOS */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginTop: '12px',
                    fontSize: '11px',
                    color: 'var(--text-dim)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '4px' }}>
                    <Layers size={11} /> {auth.requested_payload.quadrant || 'urgent_important'}
                  </span>
                  {auth.requested_payload.category && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '4px' }}>
                      <FileText size={11} /> {auth.requested_payload.category}
                    </span>
                  )}
                </div>

                {/* BOTONES DE DECISIÓN HUMANA */}
                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                    marginTop: '16px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <button
                    disabled={loadingId === auth.id}
                    onClick={() => onResolve(auth.id, false, 'Rechazada por el operador médico')}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px',
                      borderRadius: '8px',
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
                    disabled={loadingId === auth.id}
                    onClick={() => onResolve(auth.id, true)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: '#3b82f6',
                      color: '#fff',
                    }}
                  >
                    <CheckCircle2 size={15} /> Aprobar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
