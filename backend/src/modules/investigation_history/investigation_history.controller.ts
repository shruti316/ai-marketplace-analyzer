import { Request, Response, NextFunction } from 'express';
import {
  InvestigationService,
  investigationService
} from './investigation_history.service';
import {
  CreateInvestigationInput,
  InvestigationQueryInput
} from './investigation_history.schemas';

export class InvestigationController {
  constructor(private service: InvestigationService = investigationService) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user ? req.user.id : null;
      const input = req.body as CreateInvestigationInput;
      const result = await this.service.saveInvestigation(userId, input);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user ? req.user.id : null;
      const userRole = req.user ? req.user.role : null;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const result = await this.service.getInvestigationById(id, userId, userRole);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user ? req.user.id : null;
      const userRole = req.user ? req.user.role : null;
      const query = (req.parsedQuery || req.query) as unknown as InvestigationQueryInput;

      const result = await this.service.listInvestigations(userId, userRole, query);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user ? req.user.id : null;
      const userRole = req.user ? req.user.role : null;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      await this.service.deleteInvestigation(id, userId, userRole);

      res.status(200).json({
        success: true,
        message: 'Investigation record deleted successfully.',
      });
    } catch (err) {
      next(err);
    }
  }
}

export const investigationController = new InvestigationController();
