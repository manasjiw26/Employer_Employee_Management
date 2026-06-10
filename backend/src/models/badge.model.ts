import supabase from '../config/supabase';

export const BadgeModel = {
  create: async (payload: {
    companyId: string;
    name: string;
    description?: string;
    icon: string;
    pointsRequired: number;
  }) => {
    const { data, error } = await supabase
      .from('badges')
      .insert({
        company_id: payload.companyId,
        name: payload.name,
        description: payload.description,
        icon: payload.icon,
        points_required: payload.pointsRequired,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  findByCompany: async (companyId: string) => {
    const { data, error } = await supabase
      .from('badges')
      .select()
      .eq('company_id', companyId)
      .order('points_required');

    if (error) throw error;
    return data;
  },

  findEligibleForProfile: async (companyId: string, profileId: string, points: number) => {
    const { data: earned, error: earnedError } = await supabase
      .from('user_badges')
      .select('badge_id')
      .eq('profile_id', profileId);

    if (earnedError) throw earnedError;

    const earnedIds = (earned || []).map((item) => item.badge_id);
    let query = supabase
      .from('badges')
      .select()
      .eq('company_id', companyId)
      .lte('points_required', points);

    if (earnedIds.length > 0) {
      query = query.not('id', 'in', `(${earnedIds.join(',')})`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  awardToProfile: async (profileId: string, badgeId: string) => {
    const { error } = await supabase
      .from('user_badges')
      .upsert({ profile_id: profileId, badge_id: badgeId });

    if (error) throw error;
  },
};

export const AnnouncementModel = {
  create: async (payload: {
    companyId: string;
    title: string;
    content: string;
    createdById: string;
  }) => {
    const { data, error } = await supabase
      .from('announcements')
      .insert({
        company_id: payload.companyId,
        title: payload.title,
        content: payload.content,
        created_by_id: payload.createdById,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  findByCompany: async (companyId: string) => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*, createdBy:profiles!announcements_created_by_id_fkey(name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data;
  },
};

export const NotificationModel = {
  create: async (payload: {
    profileId: string;
    companyId: string;
    title: string;
    message: string;
  }) => {
    const { error } = await supabase.from('notifications').insert({
      profile_id: payload.profileId,
      company_id: payload.companyId,
      title: payload.title,
      message: payload.message,
    });

    if (error) throw error;
  },

  findByProfile: async (profileId: string, companyId: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .select()
      .eq('profile_id', profileId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;
    return data;
  },

  markRead: async (id: string, profileId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('profile_id', profileId);

    if (error) throw error;
  },

  markAllRead: async (profileId: string, companyId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('profile_id', profileId)
      .eq('company_id', companyId)
      .eq('read', false);

    if (error) throw error;
  },
};
