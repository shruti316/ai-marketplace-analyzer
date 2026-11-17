import { Request, Response, NextFunction } from 'express';
import { investigateService } from './investigate.service';
import {
  InvestigateUrlInput,
  InvestigateImageInput,
  InvestigateAdhocInput,
  AssistantChatInput
} from './investigate.schemas';

export class InvestigateController {
  async resolveUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const input = req.body as InvestigateUrlInput;
      const result = await investigateService.resolveMarketplaceUrl(input);
      res.json({
        status: 'success',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async inspectImage(req: Request, res: Response, next: NextFunction) {
    try {
      const input = req.body as InvestigateImageInput;
      const result = await investigateService.inspectImage(input);
      res.json({
        status: 'success',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async inferAdhoc(req: Request, res: Response, next: NextFunction) {
    try {
      const input = req.body as InvestigateAdhocInput;
      const result = await investigateService.inferAdhoc(input);
      res.json({
        status: 'success',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async chatAssistant(req: Request, res: Response, next: NextFunction) {
    try {
      const input = req.body as AssistantChatInput;
      const result = await investigateService.chatAssistant(input);
      res.json({
        status: 'success',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

export const investigateController = new InvestigateController();
