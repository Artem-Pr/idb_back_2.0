import { Controller, Get, Query } from '@nestjs/common';
import { SystemTestsService } from './systemTests.service';
import { ControllerMethodsPrefix } from 'src/common/constants';
import { LogController } from 'src/logger/logger.decorator';
import { MatchNumbersOfFilesTestInputDto } from './dto/match-numbers-of-files-test-input.dto';
import type { MatchNumbersOfFilesTestOutputDto } from './dto/match-numbers-of-files-test-output.dto';

@Controller()
export class SystemTestsController {
  constructor(private systemTestsService: SystemTestsService) {}

  @Get(ControllerMethodsPrefix.testSystemMatchFiles)
  @LogController(ControllerMethodsPrefix.testSystemMatchFiles)
  async matchingNumberOfFilesTest(
    @Query() query: MatchNumbersOfFilesTestInputDto,
  ): Promise<MatchNumbersOfFilesTestOutputDto> {
    return await this.systemTestsService.runMatchingNumberOfFilesTest(
      query.pid,
    );
  }
}
