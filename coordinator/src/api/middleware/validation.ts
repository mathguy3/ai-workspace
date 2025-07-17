import { Request, Response, NextFunction } from 'express';

// Simple validation functions
function validateString(value: any, minLength: number = 1, maxLength: number = 1000): boolean {
  return typeof value === 'string' && value.length >= minLength && value.length <= maxLength;
}

function validateOptionalString(value: any, maxLength: number = 1000): boolean {
  return value === undefined || validateString(value, 1, maxLength);
}

// Validation middleware factory
export function validateRequest(validators: {
  body?: (body: any) => boolean;
  params?: (params: any) => boolean;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate body
      if (validators.body && req.body && Object.keys(req.body).length > 0) {
        if (!validators.body(req.body)) {
          return res.status(400).json({
            error: 'Validation Error',
            message: 'Request body validation failed',
            statusCode: 400,
          });
        }
      }
      
      // Validate params
      if (validators.params && req.params && Object.keys(req.params).length > 0) {
        if (!validators.params(req.params)) {
          return res.status(400).json({
            error: 'Validation Error',
            message: 'Request parameters validation failed',
            statusCode: 400,
          });
        }
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Specific validation middlewares
export const validateCreateConversation = validateRequest({
  body: (body: any) => {
    // Check for unknown fields
    const allowedFields = ['model', 'systemPrompt'];
    const hasUnknownFields = Object.keys(body).some(key => !allowedFields.includes(key));
    
    if (hasUnknownFields) {
      return false;
    }
    
    return validateOptionalString(body.model, 100) && 
           validateOptionalString(body.systemPrompt, 2000);
  }
});

export const validateSendMessage = validateRequest({
  body: (body: any) => {
    // Check for unknown fields
    const allowedFields = ['content', 'model'];
    const hasUnknownFields = Object.keys(body).some(key => !allowedFields.includes(key));
    
    if (hasUnknownFields) {
      return false;
    }
    
    return validateString(body.content, 1, 10000) && 
           validateOptionalString(body.model, 100);
  }
});

export const validateUpdateConversation = validateRequest({
  body: (body: any) => {
    // Check for unknown fields
    const allowedFields = ['model', 'systemPrompt'];
    const hasUnknownFields = Object.keys(body).some(key => !allowedFields.includes(key));
    
    if (hasUnknownFields) {
      return false;
    }
    
    return validateOptionalString(body.model, 100) && 
           validateOptionalString(body.systemPrompt, 2000);
  }
});

export const validateConversationId = validateRequest({
  params: (params: any) => {
    return validateString(params.conversationId, 1, 100);
  }
});

// Content-Type validation
export function validateContentType(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.get('Content-Type');
    /*if (!contentType || !contentType.includes('application/json')) {
      console.log('Content-Type validation failed', req.headers);
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Content-Type must be application/json',
        statusCode: 400,
      });
    }*/
  }
  next();
}

// Request size validation
export function validateRequestSize(maxSize: number = 1024 * 1024) { // 1MB default
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    if (contentLength > maxSize) {
      return res.status(413).json({
        error: 'Payload Too Large',
        message: `Request body size exceeds ${maxSize} bytes`,
        statusCode: 413,
      });
    }
    next();
  };
}

// Rate limiting validation (basic implementation)
export function validateRateLimit(maxRequests: number = 10000, windowMs: number = 15 * 60 * 1000) {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    const clientRequests = requests.get(clientId);
    
    if (!clientRequests || now > clientRequests.resetTime) {
      requests.set(clientId, { count: 1, resetTime: now + windowMs });
    } else if (clientRequests.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        statusCode: 429,
        retryAfter: Math.ceil((clientRequests.resetTime - now) / 1000),
      });
    } else {
      clientRequests.count++;
    }
    
    next();
  };
} 