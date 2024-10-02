import { Controller, Delete, Get, Param } from '@nestjs/common';
import { KeywordsService } from './keywords.service';
import { ControllerPrefix } from 'src/common/constants';
import { LogController } from 'src/logger/logger.decorator';

@Controller()
export class KeywordsController {
  constructor(private readonly keywordsService: KeywordsService) {}

  @Get(ControllerPrefix.oldKeywords)
  @LogController(ControllerPrefix.oldKeywords)
  async getOldKeywordsList() {
    return await this.keywordsService.getKeywordsListFromOldCollection();
  }

  @Get(ControllerPrefix.keywords)
  @LogController(ControllerPrefix.keywords)
  async getKeywordsList() {
    return await this.keywordsService.getAllKeywords();
  }

  @Get(ControllerPrefix.unusedKeywordsOld)
  @LogController(ControllerPrefix.unusedKeywordsOld)
  async getUnusedKeywordsOld() {
    return await this.keywordsService.getUnusedKeywordsOld();
  }

  @Get(ControllerPrefix.unusedKeywords)
  @LogController(ControllerPrefix.unusedKeywords)
  async getUnusedKeywords() {
    return await this.keywordsService.getUnusedKeywords();
  }

  @Delete(ControllerPrefix.unusedKeywords)
  @LogController(ControllerPrefix.unusedKeywords)
  async removeUnusedKeywords() {
    return await this.keywordsService.removeUnusedKeywords();
  }

  @Get(ControllerPrefix.moveKeywordsToNewCollection)
  @LogController(ControllerPrefix.moveKeywordsToNewCollection)
  async moveKeywordsToNewCollection() {
    return await this.keywordsService.moveKeywordsToNewCollection();
  }

  @Delete(ControllerPrefix.keywordsItem)
  @LogController(ControllerPrefix.keywordsItem)
  async removeUnusedKeyword(@Param('keyword') keyword: string) {
    return await this.keywordsService.removeUnusedKeyword(keyword);
  }
}
