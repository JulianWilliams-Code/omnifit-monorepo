import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Combine body, params, and query for validation
      const requestData = {
        ...req.body,
        ...req.params,
        ...req.query
      };

      const validated = schema.parse(requestData);
      
      // Replace req.body with validated data
      req.body = validated;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errorMessages
        });
      }

      console.error('Validation middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error during validation'
      });
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          success: false,
          error: 'Query validation failed',
          details: errorMessages
        });
      }

      console.error('Query validation middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error during validation'
      });
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          success: false,
          error: 'Parameter validation failed',
          details: errorMessages
        });
      }

      console.error('Parameter validation middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error during validation'
      });
    }
  };
};