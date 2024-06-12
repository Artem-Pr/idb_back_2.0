import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
  BadRequestException,
} from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status = exception.getStatus();

    let message = exception.message;

    // Check if the exception has a response and if it's a BadRequestException
    if (exception instanceof BadRequestException && exception.getResponse()) {
      // Override the message with the response from the exception, which contains the validation errors
      message = (exception.getResponse() as any).message;
    }

    this.logger.error(`Status: ${status} Error: ${message}`);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message, // Use the detailed message here
    });
  }
}
