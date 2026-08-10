import { Response, NextFunction } from 'express';
import { ProductsService } from './products.service';
import { AuthRequest } from '../../types';

const productsService = new ProductsService();

export class ProductsController {
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string | undefined;
      const category = req.query.category as string | undefined;

      const result = await productsService.getAll(page, limit, search, category);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const product = await productsService.getById(req.params.id);
      res.status(200).json(product);
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const product = await productsService.create(req.body, req.user!.id);
      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const product = await productsService.update(req.params.id, req.body);
      res.status(200).json(product);
    } catch (error) {
      next(error);
    }
  }

  async getLowStock(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const products = await productsService.getLowStock();
      res.status(200).json(products);
    } catch (error) {
      next(error);
    }
  }

  async addStockMovement(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await productsService.addStockMovement(
        req.params.id,
        req.body,
        req.user!.id
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getStockMovements(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await productsService.getStockMovements(req.params.id, page, limit);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
