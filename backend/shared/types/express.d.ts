// Type declarations for modules without official types

declare module 'xss-clean' {
  import { RequestHandler } from 'express';
  function xssClean(): RequestHandler;
  export = xssClean;
}

declare module 'express-mongo-sanitize' {
  import { RequestHandler } from 'express';
  function mongoSanitize(options?: any): RequestHandler;
  export = mongoSanitize;
}

// Extend Express Request interface
declare namespace Express {
  interface Request {
    rawBody?: Buffer;
    user?: {
      userId: number;
      email: string;
      admin: boolean;
      [key: string]: any;
    };
  }
}
