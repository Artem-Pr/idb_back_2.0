import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from './config/config.service';
import { HttpExceptionFilter } from './logger/http-exception.filter';
import { setGlobalConfigService } from './config/global-config-accessor';
import { CustomLogger } from './logger/logger.service';
import { json, urlencoded } from 'express';

const logger = new CustomLogger('INIT');

export async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure body parser limits
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  app.enableCors();
  // app.enableCors({
  //   origin: ['http://example.com'], // Specify allowed origins
  //   methods: 'GET,HEAD,POST', // Specify allowed HTTP methods
  //   credentials: true, // Allow cookies
  // });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false, // Strip properties that do not have any decorators
      forbidNonWhitelisted: true, // Throw errors for non-whitelisted properties
      transform: true, // Automatically transform payloads to be objects typed according to their DTO classes
    }),
  );

  const configService = app.get(ConfigService);
  setGlobalConfigService(configService);
  const port = configService.port;

  await app.listen(port);
  logger.verbose(`Application started on: ${await app.getUrl()}`);
}
bootstrap();
