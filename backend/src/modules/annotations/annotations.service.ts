import {
  annotationsRepository,
  AnnotationTaskRow,
  TaskAssignmentRow,
  GroundTruthAnnotationRow,
  AdjudicationRow
} from './annotations.repository';
import {
  TaskListQueryParams,
  SubmitAnnotationInput,
  AdjudicateTaskInput
} from './annotations.schemas';
import { AuthUser } from '../../middleware/auth';
import { NotFoundError, ForbiddenError } from '../../middleware/errorHandler';

export interface TaskDetailResponse {
  task: AnnotationTaskRow;
  myAssignment?: TaskAssignmentRow | null;
  adjudication?: AdjudicationRow | null;
  annotations?: GroundTruthAnnotationRow[];
}

export class AnnotationsService {
  async getTasks(
    params: TaskListQueryParams
  ): Promise<{ items: AnnotationTaskRow[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    const { items, total } = await annotationsRepository.findTasks(params);
    const totalPages = Math.ceil(total / params.limit) || 1;

    return {
      items,
      pagination: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages
      }
    };
  }

  async assignTask(taskId: string, user: AuthUser): Promise<TaskAssignmentRow> {
    return annotationsRepository.assignTask(taskId, user.id);
  }

  /**
   * Retrieves task details with strict enforcement of double-blind annotation.
   * Analysts only see their own assignment and never see competing annotator submissions.
   * Admins can inspect complete multi-annotator adjudication provenance.
   */
  async getTaskById(taskId: string, user: AuthUser): Promise<TaskDetailResponse> {
    const task = await annotationsRepository.findTaskById(taskId);
    if (!task) {
      throw new NotFoundError(`Annotation task not found with ID "${taskId}"`, 'TASK_NOT_FOUND');
    }

    const myAssignment = await annotationsRepository.findUserAssignment(taskId, user.id);

    // Double-blind isolation
    if (user.role === 'ADMIN') {
      const adjudication = await annotationsRepository.findAdjudicationByTaskId(taskId);
      const annotations = await annotationsRepository.findAnnotationsForTask(taskId);
      return {
        task,
        myAssignment,
        adjudication,
        annotations
      };
    }

    // Role is ANALYST: Blinded view
    return {
      task,
      myAssignment
    };
  }

  async submitAnnotation(
    taskId: string,
    user: AuthUser,
    input: SubmitAnnotationInput
  ): Promise<GroundTruthAnnotationRow> {
    return annotationsRepository.submitAnnotation(taskId, user.id, input);
  }

  async adjudicateTask(
    taskId: string,
    user: AuthUser,
    input: AdjudicateTaskInput
  ): Promise<AdjudicationRow> {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenError(
        'Adjudication requires administrative privileges (role: ADMIN)',
        'INSUFFICIENT_ROLE'
      );
    }
    return annotationsRepository.adjudicateTask(taskId, user.id, input);
  }
}

export const annotationsService = new AnnotationsService();
