import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import * as main from './main';
import { HttpExceptionFilter } from './logger/http-exception.filter';

jest.spyOn(console, 'log').mockImplementation(() => {});
jest.mock('@nestjs/core', () => {
  const original = jest.requireActual('@nestjs/core');

  const appMock = {
    enableCors: jest.fn(),
    useGlobalFilters: jest.fn(),
    useGlobalPipes: jest.fn(),
    get: jest.fn().mockReturnValue({ port: 3000 }),
    listen: jest.fn(),
    getUrl: jest.fn().mockResolvedValue('http://test-url:3000'),
  };

  return {
    ...original,
    NestFactory: {
      ...original.NestFactory,
      create: jest.fn(() => appMock),
    },
  };
});

describe('bootstrap function', () => {
  const enableCorsMock = jest.fn();
  const useGlobalFiltersMock = jest.fn();
  const useGlobalPipesMock = jest.fn();
  const listenMock = jest.fn();
  const getUrlMock = jest.fn().mockResolvedValue('http://test-url:3000');

  beforeAll(() => {
    jest.spyOn(NestFactory, 'create').mockReturnValue({
      enableCors: enableCorsMock,
      useGlobalFilters: useGlobalFiltersMock,
      useGlobalPipes: useGlobalPipesMock,
      get: jest.fn().mockReturnValue({ port: 3000 }),
      listen: listenMock,
      getUrl: getUrlMock,
    } as any);
  });

  it('should create the app and listen on the configured port', async () => {
    await main.bootstrap();

    expect(NestFactory.create).toHaveBeenCalledWith(AppModule);
    expect(enableCorsMock).toHaveBeenCalled();
    expect(useGlobalFiltersMock).toHaveBeenCalledWith(
      new HttpExceptionFilter(),
    );
    expect(useGlobalPipesMock).toHaveBeenCalled();
    expect(listenMock).toHaveBeenCalledWith(3000);
    expect(getUrlMock).toHaveBeenCalled();
  });
});
