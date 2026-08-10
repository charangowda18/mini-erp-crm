import { Response, NextFunction } from 'express';
import { ChallansService } from './challans.service';
import { AuthRequest } from '../../types';

const challansService = new ChallansService();

export class ChallansController {
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string | undefined;

      const result = await challansService.getAll(page, limit, status);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const challan = await challansService.getById(req.params.id);
      res.status(200).json(challan);
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const challan = await challansService.create(req.body, req.user!.id);
      res.status(201).json(challan);
    } catch (error) {
      next(error);
    }
  }

  async confirm(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const challan = await challansService.confirm(req.params.id, req.user!.id);
      res.status(200).json(challan);
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const challan = await challansService.cancel(req.params.id);
      res.status(200).json(challan);
    } catch (error) {
      next(error);
    }
  }
}
