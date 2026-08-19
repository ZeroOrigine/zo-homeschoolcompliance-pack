// CANONICAL: catalog data access for states, requirements, and plans. Pages and routes read the catalog only through this module.
import { createSupabaseAnonClient } from '@/lib/supabase/server';

export type RegulationLevel = 'none' | 'low' | 'moderate' | 'high';
export type RequirementType =
  | 'notice_of_intent'
  | 'standardized_testing'
  | 'portfolio_review'
  | 'progress_report'
  | 'curriculum_plan'
  | 'instruction_hours'
  | 'recordkeeping'
  | 'other';
export type Recurrence = 'annual' | 'quarterly' | 'one_time' | 'relative';

export type StateRow = {
  id: string;
  code: string;
  name: string;
  regulation_level: RegulationLevel;
  notice_required: boolean;
  testing_required: boolean;
  files_with: string | null;
  summary: string;
  statute_citation: string | null;
};

export type StateRequirementRow = {
  id: string;
  state_code: string;
  requirement_type: RequirementType;
  title: string;
  description: string;
  recurrence: Recurrence;
  due_month: number | null;
  due_day: number | null;
  due_rule: string | null;
  applies_grades: string | null;
  sort_order: number;
};

export type PlanRow = {
  id: string;
  key: string;
  name: string;
  description: string;
  price_cents: number;
  currency: string;
  plan_interval: 'one_time' | 'month' | 'year';
  features: string[];
  is_active: boolean;
  sort_order: number;
};

const STATE_COLUMNS = 'id, code, name, regulation_level, notice_required, testing_required, files_with, summary, statute_citation';
const REQUIREMENT_COLUMNS = 'id, state_code, requirement_type, title, description, recurrence, due_month, due_day, due_rule, applies_grades, sort_order';
const PLAN_COLUMNS = 'id, key, name, description, price_cents, currency, plan_interval, features, is_active, sort_order';

type Range = { from: number; to: number };

export async function listStates(range?: Range): Promise<{ items: StateRow[]; total: number }> {
  const client = createSupabaseAnonClient();
  let query = client
    .from('homeschoolcompliancepack_states')
    .select(STATE_COLUMNS, { count: 'exact' })
    .order('name', { ascending: true });
  if (range) query = query.range(range.from, range.to);
  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return { items: (data ?? []) as StateRow[], total: count ?? 0 };
}

export async function getStateByCode(code: string): Promise<StateRow | null> {
  const client = createSupabaseAnonClient();
  const { data, error } = await client
    .from('homeschoolcompliancepack_states')
    .select(STATE_COLUMNS)
    .eq('code', code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as StateRow | null) ?? null;
}

export async function listStateRequirements(stateCode: string): Promise<StateRequirementRow[]> {
  const client = createSupabaseAnonClient();
  const { data, error } = await client
    .from('homeschoolcompliancepack_state_requirements')
    .select(REQUIREMENT_COLUMNS)
    .eq('state_code', stateCode)
    .order('sort_order', { ascending: true })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as StateRequirementRow[];
}

export async function listPlans(): Promise<PlanRow[]> {
  const client = createSupabaseAnonClient();
  const { data, error } = await client
    .from('homeschoolcompliancepack_plans')
    .select(PLAN_COLUMNS)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []) as PlanRow[];
}
