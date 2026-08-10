import { Response, NextFunction } from 'express';
import { CustomersService } from './customers.service';
import { AuthRequest } from '../../types';

const customersService = new CustomersService();

export class CustomersController {
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string | undefined;

      const result = await customersService.getAll(page, limit, search);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const customer = await customersService.getById(req.params.id);
      res.status(200).json(customer);
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const customer = await customersService.create(req.body, req.user!.id);
      res.status(201).json(customer);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const customer = await customersService.update(req.params.id, req.body);
      res.status(200).json(customer);
    } catch (error) {
      next(error);
    }
  }

  async getFollowUps(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await customersService.getFollowUps(req.params.id, page, limit);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async addFollowUp(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const followUp = await customersService.addFollowUp(
        req.params.id,
        req.body,
        req.user!.id
      );
      res.status(201).json(followUp);
    } catch (error) {
      next(error);
    }
  }
}
