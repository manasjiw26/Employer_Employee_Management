import { supabaseDb } from '../config/supabase';

export const CompanyModel = {
  create: async (name: string) => {
    const registrationCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    const { data, error } = await supabaseDb
      .from('companies')
      .insert({ name, registration_code: registrationCode })
      .select()
      .single();

    if (error) throw error;

    const { error: badgeError } = await supabaseDb.from('badges').insert([
      {
        company_id: data.id,
        name: 'Rising Star',
        description: 'Earned your first 100 points.',
        icon: 'star',
        points_required: 100,
      },
      {
        company_id: data.id,
        name: 'Achiever',
        description: 'Earned 500 points.',
        icon: 'trophy',
        points_required: 500,
      },
      {
        company_id: data.id,
        name: 'MVP',
        description: 'Earned 1000 points.',
        icon: 'award',
        points_required: 1000,
      },
    ]);

    if (badgeError) throw badgeError;
    return data;
  },

  findByCode: async (registrationCode: string) => {
    const { data, error } = await supabaseDb
      .from('companies')
      .select()
      .eq('registration_code', registrationCode)
      .single();

    if (error) return null;
    return data;
  },
};

export const ProfileModel = {
  create: async (payload: {
    id: string;
    email: string;
    name: string;
    role: string;
    companyId: string;
    jiraAccountId?: string;
    jiraDisplayName?: string;
  }) => {
    const hasJiraMapping = Boolean(payload.jiraAccountId);
    const { data, error } = await supabaseDb
      .from('profiles')
      .insert({
        id: payload.id,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        company_id: payload.companyId,
        jira_account_id: payload.jiraAccountId || null,
        jira_display_name: payload.jiraDisplayName || null,
        jira_mapped_at: hasJiraMapping ? new Date().toISOString() : null,
        // leave balances will be filled by DB defaults; include here for clarity
        sick_balance: 10,
        casual_balance: 7,
        annual_balance: 14,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  findById: async (id: string) => {
    const { data, error } = await supabaseDb
      .from('profiles')
      .select('*, company:companies(*), badges:user_badges(*, badge:badges(*))')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  },

  updateAvatarUrl: async (id: string, companyId: string, avatarUrl: string) => {
    const { data, error } = await supabaseDb
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', id)
      .eq('company_id', companyId)
      .select('id, name, email, role, company_id, avatar_url, points')
      .single();

    if (error) throw error;
    return data;
  },

  updateProfile: async (id: string, companyId: string, payload: { name?: string; phone?: string; job_title?: string; location?: string }) => {
    const updates: Record<string, any> = {};
    if (payload.name !== undefined) updates.name = payload.name;
    if (payload.phone !== undefined) updates.phone = payload.phone;
    if (payload.job_title !== undefined) updates.job_title = payload.job_title;
    if (payload.location !== undefined) updates.location = payload.location;

    const { data, error } = await supabaseDb
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .eq('company_id', companyId)
      .select('id, name, email, role, company_id, avatar_url, phone, job_title, location')
      .single();

    if (error) throw error;
    return data;
  },

  findAllByCompany: async (companyId: string) => {
    const { data, error } = await supabaseDb
      .from('profiles')
      .select('id, name, email, role, points, avatar_url, jira_account_id, jira_display_name, jira_mapped_at, created_at')
      .eq('company_id', companyId)
      .order('name');

    if (error) throw error;
    return data;
  },

  findByIdInCompany: async (id: string, companyId: string) => {
    const { data, error } = await supabaseDb
      .from('profiles')
      .select('*, badges:user_badges(*, badge:badges(*))')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) return null;
    return data;
  },

  updateRole: async (id: string, companyId: string, role: string) => {
    const { error } = await supabaseDb
      .from('profiles')
      .update({ role })
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) throw error;
  },

  updateJiraMapping: async (
    id: string,
    companyId: string,
    payload: { accountId: string; displayName: string },
  ) => {
    const { data, error } = await supabaseDb
      .from('profiles')
      .update({
        jira_account_id: payload.accountId,
        jira_display_name: payload.displayName,
        jira_mapped_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .select('id, name, email, jira_account_id, jira_display_name, jira_mapped_at')
      .single();

    if (error) throw error;
    return data;
  },

  findByJiraAccountIds: async (accountIds: string[], companyId: string) => {
    if (accountIds.length === 0) return [];

    const { data, error } = await supabaseDb
      .from('profiles')
      .select('id, name, email, jira_account_id')
      .eq('company_id', companyId)
      .in('jira_account_id', accountIds);

    if (error) throw error;
    return data;
  },

  delete: async (id: string, companyId: string) => {
    const { error } = await supabaseDb
      .from('profiles')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) throw error;
  },

  incrementPoints: async (id: string, points: number) => {
    const { data: profile, error: readError } = await supabaseDb
      .from('profiles')
      .select('points')
      .eq('id', id)
      .single();

    if (readError) throw readError;

    const { data, error } = await supabaseDb
      .from('profiles')
      .update({ points: (profile?.points || 0) + points })
      .eq('id', id)
      .select('points')
      .single();

    if (error) throw error;
    return data;
  },

  adjustLeaveBalance: async (id: string, companyId: string, type: string, days: number) => {
    // Read current balances
    const { data: profile, error: readError } = await supabaseDb
      .from('profiles')
      .select('sick_balance, casual_balance, annual_balance')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (readError) throw readError;

    const updates: Record<string, number> = {};
    if (type === 'SICK') {
      updates.sick_balance = Math.max(0, (profile?.sick_balance || 0) - days);
    } else if (type === 'CASUAL') {
      updates.casual_balance = Math.max(0, (profile?.casual_balance || 0) - days);
    } else if (type === 'ANNUAL') {
      updates.annual_balance = Math.max(0, (profile?.annual_balance || 0) - days);
    } else {
      // Unknown leave type; do nothing
      return null;
    }

    const { data, error } = await supabaseDb
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .eq('company_id', companyId)
      .select('id, sick_balance, casual_balance, annual_balance')
      .single();

    if (error) throw error;
    return data;
  },

  updateBalances: async (id: string, companyId: string, payload: { sick_balance?: number; casual_balance?: number; annual_balance?: number }) => {
    const { data, error } = await supabaseDb
      .from('profiles')
      .update(payload)
      .eq('id', id)
      .eq('company_id', companyId)
      .select('id, sick_balance, casual_balance, annual_balance')
      .single();

    if (error) throw error;
    return data;
  },

  getLeaderboard: async (companyId: string) => {
    const { data, error } = await supabaseDb
      .from('profiles')
      .select('id, name, points, avatar_url, badges:user_badges(*, badge:badges(*))')
      .eq('company_id', companyId)
      .eq('role', 'EMPLOYEE')
      .order('points', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data;
  },
};
