import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { INestApplication } from '@nestjs/common';

jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.mock('src/files/tus.service'); // TODO: Remove Tus mock after adding tests for tus

describe('AppModule', () => {
  let appModule: AppModule;
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    appModule = moduleRef.get<AppModule>(AppModule);
  });

  afterEach(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(appModule).toBeDefined();
  });
});

// If test can't run because of timeout error, check if DB is running and connection is working
