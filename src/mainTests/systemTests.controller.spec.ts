import { Test, TestingModule } from '@nestjs/testing';
import { SystemTestsController } from './systemTests.controller';
import { SystemTestsService } from './systemTests.service';
import { MatchNumbersOfFilesTestInputDto } from './dto/match-numbers-of-files-test-input.dto';
import { MatchNumbersOfFilesTestOutputDto } from './dto/match-numbers-of-files-test-output.dto';

describe('SystemTestsController', () => {
  let systemTestsController: SystemTestsController;
  let systemTestsService: SystemTestsService;

  beforeEach(async () => {
    const mockSystemTestsService = {
      runMatchingNumberOfFilesTest: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemTestsController],
      providers: [
        { provide: SystemTestsService, useValue: mockSystemTestsService },
      ],
    }).compile();

    systemTestsController = module.get<SystemTestsController>(
      SystemTestsController,
    );
    systemTestsService = module.get<SystemTestsService>(SystemTestsService);
  });

  it('should be defined', () => {
    expect(systemTestsController).toBeDefined();
  });

  describe('matchingNumberOfFilesTest', () => {
    it('should call systemTestsService.runMatchingNumberOfFilesTest with correct parameters and return its result', async () => {
      const query: MatchNumbersOfFilesTestInputDto = { pid: 123456 };
      const expectedResult = new MatchNumbersOfFilesTestOutputDto();
      expectedResult.pid = query.pid;

      jest
        .spyOn(systemTestsService, 'runMatchingNumberOfFilesTest')
        .mockResolvedValue(expectedResult);

      const result =
        await systemTestsController.matchingNumberOfFilesTest(query);
      expect(
        systemTestsService.runMatchingNumberOfFilesTest,
      ).toHaveBeenCalledWith(query.pid);
      expect(result).toBe(expectedResult);
    });
  });
});
