import { Request, Response, NextFunction } from 'express';
import { trustService } from './trust.service';
import {
  AssessmentQueryParams,
  LearnedMultimodalQueryParams,
  ReportQueryParams,
  AblationsQueryParams
} from './trust.schemas';

export class TrustController {
  async getProductTrustAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const query = req.query as unknown as AssessmentQueryParams;
      const data = await trustService.getProductTrustAssessment(id, query.prefer_cached);
      res.json({
        status: 'success',
        data
      });
    } catch (err) {
      next(err);
    }
  }

  async getProductLearnedMultimodal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const query = req.query as unknown as LearnedMultimodalQueryParams;
      const data = await trustService.getProductLearnedMultimodal(id, query.version);
      res.json({
        status: 'success',
        data
      });
    } catch (err) {
      next(err);
    }
  }

  async getProductEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await trustService.getProductEvidence(id);
      res.json({
        status: 'success',
        data
      });
    } catch (err) {
      next(err);
    }
  }

  async getProductReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const query = req.query as unknown as ReportQueryParams;
      const data = await trustService.getProductReport(id, query.format);

      // Handle raw markdown response if requested
      if (query.format === 'markdown' && typeof data === 'object' && data !== null && 'report_markdown' in data) {
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.send((data as { report_markdown: string }).report_markdown);
        return;
      }

      res.json({
        status: 'success',
        data
      });
    } catch (err) {
      next(err);
    }
  }

  async getSellerTrustAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await trustService.getSellerTrustAssessment(id);
      res.json({
        status: 'success',
        data
      });
    } catch (err) {
      next(err);
    }
  }

  async getListingTrustAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await trustService.getListingTrustAssessment(id);
      res.json({
        status: 'success',
        data
      });
    } catch (err) {
      next(err);
    }
  }

  async getModalityAblations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as AblationsQueryParams;
      const data = await trustService.getModalityAblations(query.version);
      res.json({
        status: 'success',
        data
      });
    } catch (err) {
      next(err);
    }
  }
}

export const trustController = new TrustController();
