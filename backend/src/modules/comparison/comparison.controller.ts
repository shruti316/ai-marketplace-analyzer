import { Request, Response, NextFunction } from 'express';
import { comparisonService } from './comparison.service';
import { CreateComparisonInput, ComparisonQueryParams } from './comparison.schemas';
import { UnauthorizedError } from '../../middleware/errorHandler';

export class ComparisonController {
  async createComparison(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required to create a product comparison', 'AUTHENTICATION_REQUIRED');
      }
      const body = req.body as CreateComparisonInput;
      const result = await comparisonService.createComparison(req.user, body);
      res.status(201).json({
        status: 'success',
        data: { comparison: result }
      });
    } catch (err) {
      next(err);
    }
  }

  async getComparisonById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required to view a product comparison', 'AUTHENTICATION_REQUIRED');
      }
      const id = req.params.id as string;
      const result = await comparisonService.getComparisonById(id, req.user);
      res.json({
        status: 'success',
        data: { comparison: result }
      });
    } catch (err) {
      next(err);
    }
  }

  async getUserComparisons(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required to list comparisons', 'AUTHENTICATION_REQUIRED');
      }
      const query = (req.parsedQuery || req.query) as unknown as ComparisonQueryParams;
      const page = Math.max(1, Math.floor(Number(query.page) || 1));
      const limit = Math.max(1, Math.min(50, Math.floor(Number(query.limit) || 10)));
      const result = await comparisonService.getUserComparisons(req.user, page, limit);
      res.json({
        status: 'success',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteComparison(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required to delete a product comparison', 'AUTHENTICATION_REQUIRED');
      }
      const id = req.params.id as string;
      await comparisonService.deleteComparisonById(id, req.user);
      res.json({
        status: 'success',
        message: 'Product comparison session deleted successfully'
      });
    } catch (err) {
      next(err);
    }
  }
}

export const comparisonController = new ComparisonController();
