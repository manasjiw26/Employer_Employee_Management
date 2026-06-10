import supabase from '../config/supabase';

export const TaskModel = {
  create: async (payload: {
    title: string;
    description?: string;
    assignedToId: string;
    assignedById: string;
    companyId: string;
    pointsReward: number;
    dueDate: string;
  }) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: payload.title,
        description: payload.description,
        assigned_to_id: payload.assignedToId,
        assigned_by_id: payload.assignedById,
        company_id: payload.companyId,
        points_reward: payload.pointsReward,
        due_date: payload.dueDate,
        status: 'TODO',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  findByAssignee: async (profileId: string, companyId: string) => {
    const { data, error } = await supabase
      .from('tasks')
      .select()
      .eq('assigned_to_id', profileId)
      .eq('company_id', companyId)
      .order('due_date');

    if (error) throw error;
    return data;
  },

  findAllByCompany: async (companyId: string) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, assignedTo:profiles!tasks_assigned_to_id_fkey(id, name, email, avatar_url), assignedBy:profiles!tasks_assigned_by_id_fkey(id, name, email)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  findById: async (id: string, companyId: string) => {
    const { data, error } = await supabase
      .from('tasks')
      .select()
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) return null;
    return data;
  },

  updateStatus: async (id: string, status: string, completedAt?: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status, completed_at: completedAt })
      .eq('id', id);

    if (error) throw error;
  },
};
