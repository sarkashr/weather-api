import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string;
    let stack: string | undefined;
    if (exception instanceof HttpException) {
      message = exception.message;
      stack = (exception as Error).stack;
    } else if (exception && typeof exception === 'object' && 'message' in exception) {
      message = (exception as { message: string }).message;
      stack = (exception as { stack?: string }).stack;
    } else {
      message = 'Internal server error';
      stack = undefined;
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      stack,
    };

    // Log structured error
    this.logger.error(JSON.stringify(errorResponse));

    // Send error to Sentry with extra context
    Sentry.captureException(exception, { extra: errorResponse });

    response.status(status).json(errorResponse);
  }
}
