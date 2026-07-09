import type { Request, Response } from 'express';
import { ValidationMiddleware } from './validation';

// `sanitizeObject` est privée (statique) — accès via cast pour le test.
const sanitizeObject = (obj: unknown): any =>
  (ValidationMiddleware as unknown as { sanitizeObject: (o: unknown) => any }).sanitizeObject(obj);

describe('ValidationMiddleware.sanitizeObject', () => {
  it("gère un objet à prototype null (req.query en Express 5) sans planter", () => {
    // Régression : Express 5 fournit un req.query sans prototype, ce qui faisait
    // échouer l'ancien `obj.hasOwnProperty(...)`.
    const query = Object.assign(Object.create(null), { q: '<script>hi', page: '2' });
    const result = sanitizeObject(query);
    expect(result.q).toBe('scripthi'); // chevrons retirés
    expect(result.page).toBe('2');
  });

  it('nettoie les chaînes (chevrons, javascript:, gestionnaires d’événements)', () => {
    const result = sanitizeObject({
      a: '  <b>x</b>  ',
      b: 'javascript:alert(1)',
      c: 'onclick=evil()',
    });
    expect(result.a).toBe('bx/b');
    expect(result.b).toBe('alert(1)');
    expect(result.c).toBe('evil()');
  });

  it('traite récursivement tableaux et objets imbriqués', () => {
    const result = sanitizeObject({ list: ['<a', { deep: '<x' }] });
    expect(result.list[0]).toBe('a');
    expect(result.list[1].deep).toBe('x');
  });
});

describe('ValidationMiddleware.sanitize (middleware)', () => {
  it('redéfinit req.query (getter-only en Express 5) et appelle next()', () => {
    const req = {
      body: { name: '<x' },
      query: Object.assign(Object.create(null), { q: '<y' }),
    } as unknown as Request;
    const res = {} as Response;
    const next = jest.fn();

    ValidationMiddleware.sanitize(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((req.query as Record<string, unknown>).q).toBe('y');
    expect((req.body as Record<string, unknown>).name).toBe('x');
  });
});
