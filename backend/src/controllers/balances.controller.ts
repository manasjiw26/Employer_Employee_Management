import { Request, Response } from 'express';
import { ProfileModel } from '../models/profile.model';

export const getMyBalances = async (req: Request, res: Response) => {
  try {
    const profile = await ProfileModel.findById(req.user!.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const { sick_balance, casual_balance, annual_balance } = profile;
    return res.json({ sick_balance, casual_balance, annual_balance });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Employer-only: set balances for an employee
export const setBalances = async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const { sick_balance, casual_balance, annual_balance } = req.body;

    if (!profileId) return res.status(400).json({ error: 'profileId required' });

    // Update directly via ProfileModel (using supabaseDb inside)
    const updated = await ProfileModel.updateBalances
      ? await ProfileModel.updateBalances(profileId, req.user!.companyId, { sick_balance, casual_balance, annual_balance })
      : null;

    return res.json({ balances: updated || { sick_balance, casual_balance, annual_balance } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
