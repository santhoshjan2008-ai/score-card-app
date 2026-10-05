// backend/src/validations/schemas.js
import { z } from 'zod';

export const authSchemas = {
  login: {
    body: z.object({
      usernameOrEmail: z.string().min(1, 'Username or email is required').max(255),
      password: z.string().min(1, 'Password is required')
    })
  }
};

export const tournamentSchemas = {
  create: {
    body: z.object({
      name: z.string().min(2, 'Tournament name must have at least 2 characters').max(150),
      description: z.string().max(1000).optional(),
      settings: z.object({
        allowedIncrements: z.array(z.number().int().positive()).optional(),
        maxPoints: z.number().int().positive().nullable().optional()
      }).optional()
    })
  },
  updateStatus: {
    params: z.object({
      id: z.string().uuid('Invalid tournament UUID')
    }),
    body: z.object({
      status: z.enum(['DRAFT', 'SCHEDULED', 'LIVE', 'COMPLETED', 'ARCHIVED'])
    })
  },
  addParticipant: {
    params: z.object({
      id: z.string().uuid('Invalid tournament UUID')
    }),
    body: z.object({
      name: z.string().min(2, 'Participant name must have at least 2 characters').max(100),
      seedNumber: z.number().int().positive().optional()
    })
  }
};

export const matchSchemas = {
  create: {
    params: z.object({
      tournamentId: z.string().uuid('Invalid tournament UUID')
    }),
    body: z.object({
      matchNumber: z.string().min(1).max(50),
      participantAId: z.string().uuid('Invalid participant A UUID'),
      participantBId: z.string().uuid('Invalid participant B UUID')
    })
  },
  idParam: {
    params: z.object({
      id: z.string().uuid('Invalid match UUID')
    })
  },
  unlock: {
    params: z.object({
      id: z.string().uuid('Invalid match UUID')
    }),
    body: z.object({
      reason: z.string().min(5, 'Mandatory reason (min 5 characters) required for match unlock')
    })
  }
};

export const scoreSchemas = {
  scoreCommand: {
    params: z.object({
      matchId: z.string().uuid('Invalid match UUID')
    }),
    body: z.object({
      participantId: z.string().uuid('Invalid participant UUID'),
      points: z.number().int().positive('Score increment points must be a positive integer'),
      idempotencyKey: z.string().min(5, 'Idempotency key required (min 5 characters)').max(100),
      expectedVersion: z.number().int().positive().optional()
    })
  },
  correctionCommand: {
    params: z.object({
      matchId: z.string().uuid('Invalid match UUID')
    }),
    body: z.object({
      originalEventId: z.string().uuid('Invalid original score event UUID'),
      reason: z.string().min(4, 'Correction reason required (min 4 characters)').max(500),
      idempotencyKey: z.string().min(5, 'Idempotency key required').max(100)
    })
  }
};

export const userSchemas = {
  create: {
    body: z.object({
      username: z.string().min(3).max(50),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(['ADMIN', 'OFFICIAL', 'SCOREKEEPER', 'VIEWER'])
    })
  },
  updateRole: {
    params: z.object({
      id: z.string().uuid('Invalid user UUID')
    }),
    body: z.object({
      role: z.enum(['ADMIN', 'OFFICIAL', 'SCOREKEEPER', 'VIEWER'])
    })
  }
};
