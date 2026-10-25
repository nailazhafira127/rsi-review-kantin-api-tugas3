import type { RequestHandler } from 'express';
import { AuthService } from '../services/authService.ts';

const service = new AuthService();

export const register: RequestHandler = async (_req, res) => {
  const user = await service.register(res.locals.validated.body);
  res.status(201).json({ status: 'success', data: user });
};

export const login: RequestHandler = async (_req, res) => {
  const data = await service.login(res.locals.validated.body);
  res.status(200).json({ status: 'success', data });
};

export const me: RequestHandler = async (req, res) => {
  const user = await service.me(req.user!.id);
  res.status(200).json({ status: 'success', data: user });
};