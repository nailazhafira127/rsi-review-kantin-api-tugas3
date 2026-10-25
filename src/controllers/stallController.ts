import type { RequestHandler } from 'express';
import { StallService } from '../services/stallService.ts';

const service = new StallService();

export const list: RequestHandler = async (_req, res) => {
  const { data, meta } = await service.list(res.locals.validated.query);
  res.status(200).json({ status: 'success', data, meta });
};

export const getById: RequestHandler = async (_req, res) => {
  const stall = await service.getById(res.locals.validated.params.id);
  res.status(200).json({ status: 'success', data: stall });
};

export const create: RequestHandler = async (req, res) => {
  const stall = await service.create(req.user!, res.locals.validated.body);
  res.status(201).json({ status: 'success', data: stall });
};

export const update: RequestHandler = async (req, res) => {
  const { params, body } = res.locals.validated;
  const stall = await service.update(req.user!, params.id, body);
  res.status(200).json({ status: 'success', data: stall });
};

export const remove: RequestHandler = async (_req, res) => {
  await service.remove(res.locals.validated.params.id);
  res.status(200).json({ status: 'success', message: 'Warung berhasil dihapus' });
};

export const menus: RequestHandler = async (req, res) => {
  const data = await service.getMenus(req.user!, res.locals.validated.params.id);
  res.status(200).json({ status: 'success', data });
};