import { Controller, Get } from '@nestjs/common';
import { KeywordsService } from './keywords.service';
import { ControllerPrefix } from 'src/common/constants';

@Controller(ControllerPrefix.keywords)
export class KeywordsController {
  constructor(private readonly keywordsService: KeywordsService) {}

  @Get()
  async getKeywords() {
    return await this.keywordsService.getKeywords();
  }
}
