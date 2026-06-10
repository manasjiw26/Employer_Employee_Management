import { supabaseDb } from '../config/supabase';
import { ProfileModel } from './profile.model';
import { differenceInCalendarDays, parseISO } from 'date-fns';

export const LeaveModel = {
  create: async (payload: {
    profileId: string;
    companyId: string;
    type: string;
    startDate: string;
    endDate: string;
    reason: string;
  }) => {
    const { data, error } = await supabaseDb
      .from('leave_requests')
      .insert({
        profile_id: payload.profileId,
        company_id: payload.companyId,
        type: payload.type,
        start_date: payload.startDate,
        end_date: payload.endDate,
        reason: payload.reason,
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  findByProfile: async (profileId: string, companyId: string) => {
    const { data, error } = await supabaseDb
      .from('leave_requests')
      .select()
      .eq('profile_id', profileId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  findPendingByCompany: async (companyId: string) => {
    const { data, error } = await supabaseDb
      .from('leave_requests')
      .select('*, profile:profiles(id, name, email, avatar_url)')
      .eq('company_id', companyId)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  findByCompany: async (companyId: string) => {
    const { data, error } = await supabaseDb
      .from('leave_requests')
      .select('*, profile:profiles(id, name, email, avatar_url)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  findById: async (id: string, companyId: string) => {
    const { data, error } = await supabaseDb
      .from('leave_requests')
      .select()
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) return null;
    return data;
  },

  updateStatus: async (id: string, companyId: string, status: string, managerComment?: string) => {
    const { data: leave, error: readError } = await supabaseDb
      .from('leave_requests')
      .select()
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (readError) throw readError;

    const { error } = await supabaseDb
      .from('leave_requests')
      .update({ status, manager_comment: managerComment })
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) throw error;

    // If approved, deduct from the profile's leave balance based on type and dates
    if (status === 'APPROVED' && leave) {
      try {
        const start = parseISO(leave.start_date as string);
        const end = parseISO(leave.end_date as string);
        const days = differenceInCalendarDays(end, start) + 1;
        await ProfileModel.adjustLeaveBalance(leave.profile_id, companyId, leave.type, days);
      } catch (err) {
        // Log and continue; failure to adjust balance should not block approval
        console.warn('Failed to adjust leave balance:', err);
      }
    }
  },
};
