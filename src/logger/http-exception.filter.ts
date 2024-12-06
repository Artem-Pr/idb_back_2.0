import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { CustomLogger } from './logger.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new CustomLogger(HttpExceptionFilter.name);

  catch(exception: HttpException | Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const cause = exception instanceof HttpException ? exception.cause : null;
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = exception.message;

    // Check if the exception has a response and if it's a BadRequestException
    if (exception instanceof BadRequestException && exception.getResponse()) {
      // Override the message with the response from the exception, which contains the validation errors
      message = (exception.getResponse() as any).message;
    }

    this.logger.logError({
      message: `Error: ${status} - ${message}`,
      errorData: cause,
    });

    response.status(status).json({
      message,
      path: request.url,
      statusCode: status,
      timestamp: new Date().toISOString(),
      cause,
    });
  }
}
