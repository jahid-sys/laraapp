import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

interface CreateTaskBody {
  title: string;
  priority?: string;
  dueDate?: string;
}

interface UpdateTaskBody {
  title?: string;
  completed?: boolean;
  priority?: string;
  dueDate?: string | null;
}

export function registerTaskRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/tasks - List all tasks for authenticated user
  app.fastify.get('/api/tasks', {
    schema: {
      description: 'Get all tasks for the authenticated user',
      tags: ['tasks'],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              title: { type: 'string' },
              completed: { type: 'boolean' },
              priority: { type: 'string' },
              dueDate: { type: 'string', format: 'date-time', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Fetching tasks for user');

    const tasks = await app.db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.userId, session.user.id));

    app.logger.info({ userId: session.user.id, count: tasks.length }, 'Tasks fetched successfully');
    return tasks;
  });

  // POST /api/tasks - Create a new task
  app.fastify.post('/api/tasks', {
    schema: {
      description: 'Create a new task',
      tags: ['tasks'],
      body: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            completed: { type: 'boolean' },
            priority: { type: 'string' },
            dueDate: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            userId: { type: 'string' },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (
    request: FastifyRequest<{ Body: CreateTaskBody }>,
    reply: FastifyReply
  ) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { title, priority = 'medium', dueDate } = request.body;

    app.logger.info(
      { userId: session.user.id, title, priority, dueDate },
      'Creating task'
    );

    try {
      const [newTask] = await app.db
        .insert(schema.tasks)
        .values({
          title,
          priority: (priority as 'low' | 'medium' | 'high') || 'medium',
          dueDate: dueDate ? new Date(dueDate) : null,
          userId: session.user.id,
        })
        .returning();

      app.logger.info({ taskId: newTask.id, userId: session.user.id }, 'Task created successfully');
      reply.code(201);
      return newTask;
    } catch (error) {
      app.logger.error(
        { err: error, userId: session.user.id, body: request.body },
        'Failed to create task'
      );
      throw error;
    }
  });

  // PUT /api/tasks/:id - Update a task
  app.fastify.put('/api/tasks/:id', {
    schema: {
      description: 'Update a task',
      tags: ['tasks'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          completed: { type: 'boolean' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            completed: { type: 'boolean' },
            priority: { type: 'string' },
            dueDate: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            userId: { type: 'string' },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        403: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateTaskBody }>,
    reply: FastifyReply
  ) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params;
    const { title, completed, priority, dueDate } = request.body;

    app.logger.info(
      { userId: session.user.id, taskId: id, body: request.body },
      'Updating task'
    );

    try {
      // Check if task exists and belongs to user
      const existingTask = await app.db
        .select()
        .from(schema.tasks)
        .where(and(eq(schema.tasks.id, id), eq(schema.tasks.userId, session.user.id)));

      if (existingTask.length === 0) {
        app.logger.warn(
          { userId: session.user.id, taskId: id },
          'Task not found or unauthorized'
        );
        return reply.status(404).send({ error: 'Task not found' });
      }

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (completed !== undefined) updateData.completed = completed;
      if (priority !== undefined) updateData.priority = priority;
      if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

      const [updatedTask] = await app.db
        .update(schema.tasks)
        .set(updateData)
        .where(eq(schema.tasks.id, id))
        .returning();

      app.logger.info(
        { taskId: id, userId: session.user.id },
        'Task updated successfully'
      );
      return updatedTask;
    } catch (error) {
      app.logger.error(
        { err: error, userId: session.user.id, taskId: id, body: request.body },
        'Failed to update task'
      );
      throw error;
    }
  });

  // DELETE /api/tasks/:id - Delete a task
  app.fastify.delete('/api/tasks/:id', {
    schema: {
      description: 'Delete a task',
      tags: ['tasks'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        403: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params;

    app.logger.info({ userId: session.user.id, taskId: id }, 'Deleting task');

    try {
      // Check if task exists and belongs to user
      const existingTask = await app.db
        .select()
        .from(schema.tasks)
        .where(and(eq(schema.tasks.id, id), eq(schema.tasks.userId, session.user.id)));

      if (existingTask.length === 0) {
        app.logger.warn(
          { userId: session.user.id, taskId: id },
          'Task not found or unauthorized'
        );
        return reply.status(404).send({ error: 'Task not found' });
      }

      await app.db.delete(schema.tasks).where(eq(schema.tasks.id, id));

      app.logger.info(
        { taskId: id, userId: session.user.id },
        'Task deleted successfully'
      );
      return { success: true };
    } catch (error) {
      app.logger.error(
        { err: error, userId: session.user.id, taskId: id },
        'Failed to delete task'
      );
      throw error;
    }
  });
}
