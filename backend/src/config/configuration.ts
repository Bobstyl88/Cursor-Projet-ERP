export interface AppConfig {
  app: {
    port: number;
    nodeEnv: string;
    corsOrigins: string;
  };
  database: {
    url: string;
  };
  redis: {
    url: string;
    host: string;
    port: number;
  };
  jwt: {
    secret: string;
    expiration: string;
  };
}

export default (): AppConfig => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  let redisHost = 'localhost';
  let redisPort = 6379;

  try {
    const parsed = new URL(redisUrl);
    redisHost = parsed.hostname;
    redisPort = parseInt(parsed.port, 10) || 6379;
  } catch {
    /* fallback to defaults */
  }

  return {
    app: {
      port: parseInt(process.env.PORT || '4000', 10),
      nodeEnv: process.env.NODE_ENV || 'development',
      corsOrigins: process.env.CORS_ORIGINS || 'http://localhost:3000',
    },
    database: {
      url:
        process.env.DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/erp_saas?schema=public',
    },
    redis: {
      url: redisUrl,
      host: redisHost,
      port: redisPort,
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'change-me',
      expiration: process.env.JWT_EXPIRATION || '24h',
    },
  };
};
