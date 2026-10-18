export type EisenhowerQuadrant =
  | 'urgent_important'
  | 'not_urgent_important'
  | 'urgent_not_important'
  | 'not_urgent_not_important';

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'archived';

export type AuthRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export type BotActionType =
  | 'create_task'
  | 'update_task'
  | 'delete_task'
  | 'read_phi'
  | 'bulk_sync';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  quadrant: EisenhowerQuadrant;
  status: TaskStatus;
  phi_flag: boolean;
  phi_encrypted_notes?: string | null;
  due_date: string | null;
  created_by_bot: string | null;
  created_at: string;
  updated_at: string;
}

export interface BotAuthorization {
  id: string;
  user_id: string;
  bot_name: 'Dots' | 'Musa' | string;
  action_type: BotActionType;
  target_task_id: string | null;
  requested_payload: {
    title?: string;
    description?: string;
    quadrant?: EisenhowerQuadrant;
    phi_flag?: boolean;
    due_date?: string;
    [key: string]: unknown;
  };
  phi_risk_detected: boolean;
  status: AuthRequestStatus;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface BotAuditLog {
  id: string;
  user_id: string;
  bot_name: string;
  action_type: string;
  authorization_id: string | null;
  task_id: string | null;
  accessed_phi: boolean;
  ip_address: string | null;
  user_agent: string | null;
  event_details: Record<string, unknown>;
  timestamp: string;
}
