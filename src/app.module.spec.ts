import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { INestApplication } from '@nestjs/common';

jest.spyOn(console, 'log').mockImplementation(() => {});

describe('AppModule', () => {
  let appModule: AppModule;
  let app: INestApplication; // Add this

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication(); // Add this
    await app.init(); // Add this
    appModule = moduleRef.get<AppModule>(AppModule);
  });

  afterEach(async () => {
    await app.close(); // Add this to close the application
  });

  it('should be defined', () => {
    expect(appModule).toBeDefined();
  });
});
