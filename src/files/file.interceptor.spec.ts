import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FileMediaInterceptor } from './file.interceptor';
import { ConfigService } from 'src/config/config.service';
import { of } from 'rxjs';

const mockCallHandler: CallHandler = {
  handle: jest.fn().mockReturnValue(of('test')),
};
const mockExecutionContext: ExecutionContext = {
  switchToHttp: jest.fn().mockReturnValue({
    getRequest: jest.fn().mockReturnValue({
      headers: {
        'transfer-encoding': 'chunked',
      },
      file: {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
      },
    }),
    getResponse: jest.fn().mockReturnValue({}),
  }),
  getClass: jest.fn(),
  getHandler: jest.fn(),
} as unknown as ExecutionContext;

const configService = {
  rootPaths: {
    temp: 'some/temp/path',
  },
};

describe('FileMediaInterceptor', () => {
  let interceptor: FileMediaInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileMediaInterceptor,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    interceptor = module.get<FileMediaInterceptor>(FileMediaInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should allow upload of supported file type', async () => {
    const spy = jest.spyOn(mockCallHandler, 'handle');
    await interceptor.intercept(mockExecutionContext, mockCallHandler);
    expect(spy).toHaveBeenCalled();
  });
});
