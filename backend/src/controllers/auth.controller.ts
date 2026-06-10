import { Request, Response } from 'express';
import supabase from '../config/supabase';
import { CompanyModel, ProfileModel } from '../models/profile.model';

export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Create session for the new user so they can proceed to register
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.session) {
      return res.status(201).json({ user: data.user });
    }

    return res.status(201).json({
      user: data.user,
      session: signInData.session,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const signin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[auth.signin] Supabase signin error:', error);
      return res.status(401).json({ error: error.message });
    }

    return res.json({
      user: data.user,
      session: data.session,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.slice('Bearer '.length);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user?.email) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { name, role, companyName, registrationCode } = req.body;
    if (!name || !role) {
      return res.status(400).json({ error: 'name and role are required' });
    }

    if (!['EMPLOYEE', 'EMPLOYER'].includes(role)) {
      return res.status(400).json({ error: 'Role must be EMPLOYEE or EMPLOYER' });
    }

    const existingProfile = await ProfileModel.findById(authData.user.id);
    if (existingProfile) {
      return res.status(409).json({ error: 'Profile already exists' });
    }

    let company;
    if (role === 'EMPLOYER') {
      if (!companyName) {
        return res.status(400).json({ error: 'companyName is required for employers' });
      }
      company = await CompanyModel.create(companyName);
    } else {
      if (!registrationCode) {
        return res.status(400).json({ error: 'registrationCode is required for employees' });
      }
      company = await CompanyModel.findByCode(registrationCode);
      if (!company) {
        return res.status(404).json({ error: 'Invalid registration code' });
      }
    }

    const profile = await ProfileModel.create({
      id: authData.user.id,
      email: authData.user.email,
      name,
      role,
      companyId: company.id,
    });

    return res.status(201).json({ profile, company });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const profile = await ProfileModel.findById(req.user!.id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    return res.json(profile);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const createAvatarUploadUrl = async (req: Request, res: Response) => {
  try {
    const { fileName, contentType } = req.body;
    if (!fileName || !contentType) {
      return res.status(400).json({ error: 'fileName and contentType are required' });
    }

    if (!String(contentType).startsWith('image/')) {
      return res.status(400).json({ error: 'Only image uploads are allowed' });
    }

    const extension = String(fileName).split('.').pop() || 'jpg';
    const path = `${req.user!.id}/avatar.${extension.toLowerCase()}`;
    const { data, error } = await supabase.storage
      .from('avatars')
      .createSignedUploadUrl(path, { upsert: true });

    if (error) throw error;

    const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(path);
    return res.json({ ...data, publicUrl: publicData.publicUrl });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateAvatarUrl = async (req: Request, res: Response) => {
  try {
    const { avatarUrl } = req.body;
    if (!avatarUrl) {
      return res.status(400).json({ error: 'avatarUrl is required' });
    }

    const profile = await ProfileModel.updateAvatarUrl(req.user!.id, req.user!.companyId, avatarUrl);
    return res.json(profile);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { name, phone, job_title, location } = req.body;
    if (name === undefined && phone === undefined && job_title === undefined && location === undefined) {
      return res.status(400).json({ error: 'At least one updatable field is required' });
    }

    const profile = await ProfileModel.updateProfile(req.user!.id, req.user!.companyId, { name, phone, job_title, location });
    return res.json(profile);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
