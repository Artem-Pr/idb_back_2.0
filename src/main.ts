import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from './config/config.service';
import { HttpExceptionFilter } from './logger/http-exception.filter';

export async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false, // Strip properties that do not have any decorators
      forbidNonWhitelisted: true, // Throw errors for non-whitelisted properties
      transform: true, // Automatically transform payloads to be objects typed according to their DTO classes
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.port;

  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
