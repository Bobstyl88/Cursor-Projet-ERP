import * as Joi from 'joi';

export const validationSchema = Joi.object({
  DATABASE_URL: Joi.string().uri().required().messages({
    'string.uri': 'DATABASE_URL must be a valid connection string',
    'any.required': 'DATABASE_URL is required',
  }),

  REDIS_URL: Joi.string().uri().default('redis://localhost:6379'),

  JWT_SECRET: Joi.string().min(8).required().messages({
    'string.min': 'JWT_SECRET must be at least 8 characters long',
    'any.required': 'JWT_SECRET is required',
  }),

  JWT_EXPIRATION: Joi.string().default('24h'),

  PORT: Joi.number().port().default(4000),

  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),

  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
});
