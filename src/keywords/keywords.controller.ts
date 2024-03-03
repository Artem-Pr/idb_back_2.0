import { Controller, Get } from '@nestjs/common';
import { KeywordsService } from './keywords.service';
import { ControllerPrefix } from 'src/common/constants';

@Controller()
export class KeywordsController {
  constructor(private readonly keywordsService: KeywordsService) {}

  @Get(ControllerPrefix.keywords)
  async getKeywordsList() {
    return await this.keywordsService.getKeywordsList();
  }

  @Get(ControllerPrefix.unusedKeywords)
  async getUnusedKeywords() {
    return await this.keywordsService.getUnusedKeywords();
  }
}
