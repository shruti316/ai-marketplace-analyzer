import { RowDataPacket, PoolConnection } from 'mysql2/promise';
import crypto from 'node:crypto';
import { query, queryOne, withTransaction } from '../../config/database';
import { TaskListQueryParams, SubmitAnnotationInput, AdjudicateTaskInput } from './annotations.schemas';
import { NotFoundError, ConflictError, ValidationError } from '../../middleware/errorHandler';

export interface AnnotationTaskRow extends RowDataPacket {
  id: string;
  canonical_product_id: string;
  marketplace: string;
  target_entity_type: string;
  target_entity_id: string;
  task_payload_json: unknown;
  task_status: string;
  recommended_annotator_count: number;
  target_guidelines_version: string;
  created_at: string;
  updated_at: string;
  product_title?: string;
}

export interface TaskAssignmentRow extends RowDataPacket {
  id: string;
  task_id: string;
  assigned_user_id: string;
  assignment_status: string;
  assigned_at: string;
  completed_at: string | null;
}

export interface GroundTruthAnnotationRow extends RowDataPacket {
  id: string;
  task_id: string;
  user_id: string;
  assigned_taxonomy: string;
  confidence_score: number;
  sentiment_label: string;
  authenticity_label: string;
  aspect_polarities_json: unknown;
  review_rationale: string | null;
  submitted_at: string;
}

export interface AdjudicationRow extends RowDataPacket {
  id: string;
  task_id: string;
  adjudicator_user_id: string | null;
  consensus_taxonomy: string;
  adjudication_status: string;
  inter_annotator_agreement_cohen_kappa: number | null;
  is_multi_annotator_adjudicated: number | boolean;
  adjudication_notes: string | null;
  adjudicated_at: string;
}

export interface CountRow extends RowDataPacket {
  total: number;
}

export interface AssignedCountRow extends RowDataPacket {
  assigned_count: number;
}

export interface CompletedCountRow extends RowDataPacket {
  completed_count: number;
}

export class AnnotationsRepository {
  /**
   * Queries annotation tasks with filters and pagination.
   */
  async findTasks(params: TaskListQueryParams): Promise<{ items: AnnotationTaskRow[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (params.status) {
      conditions.push('t.task_status = ?');
      values.push(params.status);
    }

    if (params.target_type) {
      conditions.push('t.target_entity_type = ?');
      values.push(params.target_type);
    }

    if (params.canonical_product_id) {
      conditions.push('t.canonical_product_id = ?');
      values.push(params.canonical_product_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRow] = await query<CountRow[]>(
      `SELECT COUNT(*) AS total FROM annotation_tasks t ${whereClause}`,
      values
    );
    const total = countRow?.total ?? 0;

    const limit = Math.max(1, Math.min(100, Math.floor(Number(params.limit) || 20)));
    const page = Math.max(1, Math.floor(Number(params.page) || 1));
    const offset = (page - 1) * limit;

    const dataSql = `
      SELECT t.*, p.product_title
      FROM annotation_tasks t
      LEFT JOIN canonical_products p ON t.canonical_product_id = p.canonical_product_id
      ${whereClause}
      ORDER BY t.created_at ASC
      LIMIT ? OFFSET ?
    `;

    const items = await query<AnnotationTaskRow[]>(dataSql, [...values, limit, offset]);

    return { items, total };
  }

  /**
   * Finds task by ID with product title.
   */
  async findTaskById(id: string): Promise<AnnotationTaskRow | null> {
    const sql = `
      SELECT t.*, p.product_title
      FROM annotation_tasks t
      LEFT JOIN canonical_products p ON t.canonical_product_id = p.canonical_product_id
      WHERE t.id = ?
      LIMIT 1
    `;
    return queryOne<AnnotationTaskRow>(sql, [id]);
  }

  /**
   * Finds existing assignment for a specific user and task.
   */
  async findUserAssignment(taskId: string, userId: string): Promise<TaskAssignmentRow | null> {
    const sql = `
      SELECT *
      FROM annotation_task_assignments
      WHERE task_id = ? AND assigned_user_id = ?
      LIMIT 1
    `;
    return queryOne<TaskAssignmentRow>(sql, [taskId, userId]);
  }

  /**
   * Assigns task to user with pessimistic lock (SELECT ... FOR UPDATE) and state validation.
   */
  async assignTask(taskId: string, userId: string): Promise<TaskAssignmentRow> {
    return withTransaction(async (conn: PoolConnection) => {
      // 1. Lock parent task
      const [taskRows] = await conn.query<AnnotationTaskRow[]>(
        'SELECT * FROM annotation_tasks WHERE id = ? FOR UPDATE',
        [taskId]
      );
      const task = taskRows[0];

      if (!task) {
        throw new NotFoundError(`Annotation task not found with ID "${taskId}"`, 'TASK_NOT_FOUND');
      }

      if (!['PENDING', 'ASSIGNED', 'IN_REVIEW'].includes(task.task_status)) {
        throw new ConflictError(
          `Cannot assign task with status "${task.task_status}". Task is already finalized or discarded.`,
          'TASK_NOT_ASSIGNABLE'
        );
      }

      // 2. Check if user already assigned
      const [existingUserRows] = await conn.query<TaskAssignmentRow[]>(
        'SELECT * FROM annotation_task_assignments WHERE task_id = ? AND assigned_user_id = ? FOR UPDATE',
        [taskId, userId]
      );
      if (existingUserRows.length > 0) {
        throw new ConflictError(
          `User is already assigned to task "${taskId}".`,
          'ALREADY_ASSIGNED'
        );
      }

      // 3. Check active capacity
      const [countRows] = await conn.query<AssignedCountRow[]>(
        `SELECT COUNT(*) AS assigned_count
         FROM annotation_task_assignments
         WHERE task_id = ? AND assignment_status IN ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED')`,
        [taskId]
      );
      const currentAssigned = countRows[0]?.assigned_count ?? 0;

      if (currentAssigned >= task.recommended_annotator_count) {
        throw new ConflictError(
          `Task has already reached its recommended annotator capacity (${task.recommended_annotator_count}).`,
          'CAPACITY_REACHED'
        );
      }

      // 4. Create assignment
      const assignmentId = crypto.randomUUID();
      await conn.query(
        `INSERT INTO annotation_task_assignments (
          id, task_id, assigned_user_id, assignment_status, assigned_at
        ) VALUES (?, ?, ?, 'ASSIGNED', NOW(3))`,
        [assignmentId, taskId, userId]
      );

      // 5. Transition task status from PENDING to ASSIGNED if needed
      if (task.task_status === 'PENDING') {
        await conn.query(
          'UPDATE annotation_tasks SET task_status = \'ASSIGNED\', updated_at = NOW(3) WHERE id = ?',
          [taskId]
        );
      }

      const [assignedRows] = await conn.query<TaskAssignmentRow[]>(
        'SELECT * FROM annotation_task_assignments WHERE id = ?',
        [assignmentId]
      );

      return assignedRows[0];
    });
  }

  /**
   * Submits annotation, validates active assignment, prevents duplicates, and transitions task.
   */
  async submitAnnotation(
    taskId: string,
    userId: string,
    input: SubmitAnnotationInput
  ): Promise<GroundTruthAnnotationRow> {
    return withTransaction(async (conn: PoolConnection) => {
      // 1. Lock parent task
      const [taskRows] = await conn.query<AnnotationTaskRow[]>(
        'SELECT * FROM annotation_tasks WHERE id = ? FOR UPDATE',
        [taskId]
      );
      const task = taskRows[0];
      if (!task) {
        throw new NotFoundError(`Annotation task not found with ID "${taskId}"`, 'TASK_NOT_FOUND');
      }

      // 2. Lock and verify active assignment
      const [assignmentRows] = await conn.query<TaskAssignmentRow[]>(
        'SELECT * FROM annotation_task_assignments WHERE task_id = ? AND assigned_user_id = ? FOR UPDATE',
        [taskId, userId]
      );
      const assignment = assignmentRows[0];

      if (!assignment) {
        throw new ConflictError(
          `No assignment record found for user on task "${taskId}". Task must be assigned before submitting.`,
          'ASSIGNMENT_MISSING'
        );
      }

      // 3. Check for duplicate ground truth annotation first
      const [existingAnnotationRows] = await conn.query<GroundTruthAnnotationRow[]>(
        'SELECT * FROM ground_truth_annotations WHERE task_id = ? AND user_id = ? FOR UPDATE',
        [taskId, userId]
      );
      if (existingAnnotationRows.length > 0) {
        throw new ConflictError(
          `Duplicate submission rejected: Ground truth annotation already submitted for task "${taskId}".`,
          'DUPLICATE_SUBMISSION'
        );
      }

      if (!['ASSIGNED', 'IN_PROGRESS'].includes(assignment.assignment_status)) {
        throw new ConflictError(
          `Assignment status is "${assignment.assignment_status}". Only active assignments can be submitted.`,
          'INVALID_ASSIGNMENT_STATE'
        );
      }

      // 4. Insert ground truth annotation
      const annotationId = `ann_${crypto.randomUUID().replace(/-/g, '').slice(0, 30)}`;
      const aspectJson = input.aspect_polarities ? JSON.stringify(input.aspect_polarities) : null;

      await conn.query(
        `INSERT INTO ground_truth_annotations (
          id, task_id, user_id, assigned_taxonomy, confidence_score,
          sentiment_label, authenticity_label, aspect_polarities_json,
          review_rationale, submitted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3))`,
        [
          annotationId,
          taskId,
          userId,
          input.assigned_taxonomy,
          input.confidence_score,
          input.sentiment_label,
          input.authenticity_label,
          aspectJson,
          input.review_rationale || null
        ]
      );

      // 5. Update assignment status to COMPLETED
      await conn.query(
        'UPDATE annotation_task_assignments SET assignment_status = \'COMPLETED\', completed_at = NOW(3) WHERE id = ?',
        [assignment.id]
      );

      // 6. Check if all recommended annotators have completed
      const [completedRows] = await conn.query<CompletedCountRow[]>(
        `SELECT COUNT(*) AS completed_count
         FROM annotation_task_assignments
         WHERE task_id = ? AND assignment_status = 'COMPLETED'`,
        [taskId]
      );
      const completedCount = completedRows[0]?.completed_count ?? 0;

      if (completedCount >= task.recommended_annotator_count) {
        await conn.query(
          'UPDATE annotation_tasks SET task_status = \'IN_REVIEW\', updated_at = NOW(3) WHERE id = ?',
          [taskId]
        );
      }

      const [savedAnnotation] = await conn.query<GroundTruthAnnotationRow[]>(
        'SELECT * FROM ground_truth_annotations WHERE id = ?',
        [annotationId]
      );

      return savedAnnotation[0];
    });
  }

  /**
   * Adjudicates task and records inter-annotator consensus.
   */
  async adjudicateTask(
    taskId: string,
    adjudicatorId: string,
    input: AdjudicateTaskInput
  ): Promise<AdjudicationRow> {
    return withTransaction(async (conn: PoolConnection) => {
      // 1. Lock parent task
      const [taskRows] = await conn.query<AnnotationTaskRow[]>(
        'SELECT * FROM annotation_tasks WHERE id = ? FOR UPDATE',
        [taskId]
      );
      const task = taskRows[0];
      if (!task) {
        throw new NotFoundError(`Annotation task not found with ID "${taskId}"`, 'TASK_NOT_FOUND');
      }

      // 2. Check if already adjudicated
      const [existingAdjRows] = await conn.query<AdjudicationRow[]>(
        'SELECT * FROM annotation_adjudications WHERE task_id = ? FOR UPDATE',
        [taskId]
      );
      if (existingAdjRows.length > 0) {
        throw new ConflictError(
          `Task "${taskId}" has already been adjudicated.`,
          'ALREADY_ADJUDICATED'
        );
      }

      // 3. Insert adjudication record
      const adjudicationId = crypto.randomUUID();
      await conn.query(
        `INSERT INTO annotation_adjudications (
          id, task_id, adjudicator_user_id, consensus_taxonomy,
          adjudication_status, inter_annotator_agreement_cohen_kappa,
          is_multi_annotator_adjudicated, adjudication_notes, adjudicated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(3))`,
        [
          adjudicationId,
          taskId,
          adjudicatorId,
          input.consensus_taxonomy,
          input.adjudication_status,
          input.inter_annotator_agreement_cohen_kappa ?? null,
          input.is_multi_annotator_adjudicated ? 1 : 0,
          input.adjudication_notes || null
        ]
      );

      // 4. Update task status to ADJUDICATED
      await conn.query(
        'UPDATE annotation_tasks SET task_status = \'ADJUDICATED\', updated_at = NOW(3) WHERE id = ?',
        [taskId]
      );

      const [savedAdj] = await conn.query<AdjudicationRow[]>(
        'SELECT * FROM annotation_adjudications WHERE id = ?',
        [adjudicationId]
      );

      return savedAdj[0];
    });
  }

  /**
   * Retrieves adjudication record for a task.
   */
  async findAdjudicationByTaskId(taskId: string): Promise<AdjudicationRow | null> {
    return queryOne<AdjudicationRow>(
      'SELECT * FROM annotation_adjudications WHERE task_id = ? LIMIT 1',
      [taskId]
    );
  }

  /**
   * Retrieves all submitted ground truth annotations for a task (ADMIN only).
   */
  async findAnnotationsForTask(taskId: string): Promise<GroundTruthAnnotationRow[]> {
    return query<GroundTruthAnnotationRow[]>(
      'SELECT * FROM ground_truth_annotations WHERE task_id = ? ORDER BY submitted_at ASC',
      [taskId]
    );
  }
}

export const annotationsRepository = new AnnotationsRepository();
