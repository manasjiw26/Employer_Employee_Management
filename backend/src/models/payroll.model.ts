import supabase from '../config/supabase';

export const PayrollModel = {
  create: async (payload: {
    profileId: string;
    companyId: string;
    month: number;
    year: number;
    baseSalary: number;
    bonuses: number;
    deductions: number;
    netSalary: number;
  }) => {
    const { data, error } = await supabase
      .from('payrolls')
      .insert({
        profile_id: payload.profileId,
        company_id: payload.companyId,
        month: payload.month,
        year: payload.year,
        base_salary: payload.baseSalary,
        bonuses: payload.bonuses,
        deductions: payload.deductions,
        net_salary: payload.netSalary,
        status: 'UNPAID',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  findById: async (id: string, companyId: string) => {
    const { data, error } = await supabase
      .from('payrolls')
      .select()
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) return null;
    return data;
  },

  markPaid: async (id: string, companyId: string) => {
    const { error } = await supabase
      .from('payrolls')
      .update({ status: 'PAID' })
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) throw error;
  },

  findByProfile: async (profileId: string, companyId: string) => {
    const { data, error } = await supabase
      .from('payrolls')
      .select()
      .eq('profile_id', profileId)
      .eq('company_id', companyId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) throw error;
    return data;
  },

  findWithFilter: async (opts: {
    companyId: string;
    profileId?: string;
    month?: number;
    year?: number;
  }) => {
    let query = supabase.from('payrolls').select('*, profile:profiles(id, name, email)')
      .eq('company_id', opts.companyId);

    if (opts.profileId) query = query.eq('profile_id', opts.profileId);
    if (opts.month) query = query.eq('month', opts.month);
    if (opts.year) query = query.eq('year', opts.year);

    const { data, error } = await query.order('year', { ascending: false }).order('month', { ascending: false });
    if (error) throw error;
    return data;
  },

  findOneWithProfile: async (id: string, companyId: string) => {
    const { data, error } = await supabase
      .from('payrolls')
      .select('*, profile:profiles(id, name, email)')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) return null;
    return data;
  },

  findAllByCompany: async (companyId: string) => {
    const { data, error } = await supabase
      .from('payrolls')
      .select('*, profile:profiles(id, name, email)')
      .eq('company_id', companyId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) throw error;
    return data;
  },
};
