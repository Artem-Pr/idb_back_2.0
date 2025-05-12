import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import * as main from './main';
import { HttpExceptionFilter } from './logger/http-exception.filter';
import { ConfigService } from './config/config.service';

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
    use: jest.fn(),
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
  const useMock = jest.fn();
  const getMock = jest.fn().mockReturnValue({ port: 3000 });

  beforeAll(() => {
    jest.spyOn(NestFactory, 'create').mockReturnValue({
      enableCors: enableCorsMock,
      useGlobalFilters: useGlobalFiltersMock,
      useGlobalPipes: useGlobalPipesMock,
      get: getMock,
      listen: listenMock,
      getUrl: getUrlMock,
      use: useMock,
    } as any);
  });

  it('should create the app and configure it properly', async () => {
    await main.bootstrap();

    // Verify app creation
    expect(NestFactory.create).toHaveBeenCalledWith(AppModule);

    // Verify body parser configuration
    expect(useMock).toHaveBeenCalledTimes(2);
    const firstCallArg = useMock.mock.calls[0][0];
    const secondCallArg = useMock.mock.calls[1][0];
    expect(typeof firstCallArg).toBe('function');
    expect(typeof secondCallArg).toBe('function');
    expect(firstCallArg.name).toBe('jsonParser');
    expect(secondCallArg.name).toBe('urlencodedParser');

    // Verify CORS configuration
    expect(enableCorsMock).toHaveBeenCalled();

    // Verify global filters
    expect(useGlobalFiltersMock).toHaveBeenCalledWith(
      new HttpExceptionFilter(),
    );

    // Verify validation pipe configuration
    expect(useGlobalPipesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isTransformEnabled: true,
        validatorOptions: expect.objectContaining({
          whitelist: false,
          forbidNonWhitelisted: true,
        }),
      }),
    );

    // Verify ConfigService setup
    expect(getMock).toHaveBeenCalledWith(ConfigService);

    // Verify app listening
    expect(listenMock).toHaveBeenCalledWith(3000);
    expect(getUrlMock).toHaveBeenCalled();
  });
});
