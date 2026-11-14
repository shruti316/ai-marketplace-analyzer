import { Request, Response, NextFunction } from 'express';
import { annotationsService } from './annotations.service';
import {
  TaskListQueryParams,
  SubmitAnnotationInput,
  AdjudicateTaskInput
} from './annotations.schemas';
import { UnauthorizedError } from '../../middleware/errorHandler';

export class AnnotationsController {
  async getTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = (req.parsedQuery || req.query) as unknown as TaskListQueryParams;
      const result = await annotationsService.getTasks(query);
      res.json({
        status: 'success',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async assignTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required to assign task', 'AUTHENTICATION_REQUIRED');
      }
      const id = req.params.id as string;
      const assignment = await annotationsService.assignTask(id, req.user);
      res.status(201).json({
        status: 'success',
        data: { assignment }
      });
    } catch (err) {
      next(err);
    }
  }

  async getTaskById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required to view annotation task', 'AUTHENTICATION_REQUIRED');
      }
      const id = req.params.id as string;
      const result = await annotationsService.getTaskById(id, req.user);
      res.json({
        status: 'success',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async submitAnnotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required to submit annotation', 'AUTHENTICATION_REQUIRED');
      }
      const id = req.params.id as string;
      const body = req.body as SubmitAnnotationInput;
      const annotation = await annotationsService.submitAnnotation(id, req.user, body);
      res.status(201).json({
        status: 'success',
        data: { annotation }
      });
    } catch (err) {
      next(err);
    }
  }

  async adjudicateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required to adjudicate task', 'AUTHENTICATION_REQUIRED');
      }
      const id = req.params.id as string;
      const body = req.body as AdjudicateTaskInput;
      const adjudication = await annotationsService.adjudicateTask(id, req.user, body);
      res.status(201).json({
        status: 'success',
        data: { adjudication }
      });
    } catch (err) {
      next(err);
    }
  }
}

export const annotationsController = new AnnotationsController();
