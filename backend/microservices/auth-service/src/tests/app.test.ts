import authService from '../src/app';
import request from 'supertest';

describe('Auth Service', () => {
  beforeAll(async () => {
    // Configuration de test sans base de données
    process.env.NODE_ENV = 'test';
  });

  afterAll(async () => {
    await authService.stop();
  });

  describe('Health Check', () => {
    test('GET /health should return 200', async () => {
      const response = await request(authService.app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Auth Service is running',
        timestamp: expect.any(String),
        service: 'auth-service',
        version: expect.any(String),
      });
    });
  });

  describe('Root endpoint', () => {
    test('GET / should return service info', async () => {
      const response = await request(authService.app)
        .get('/')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Groupomania Auth Service API',
        version: expect.any(String),
        documentation: '/api/docs',
      });
    });
  });

  describe('404 handler', () => {
    test('Should return 404 for non-existent routes', async () => {
      const response = await request(authService.app)
        .get('/non-existent-route')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Route GET /non-existent-route non trouvée',
      });
    });
  });
});
