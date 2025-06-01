import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { KeywordsService } from './keywords.service';
import { ControllerMethodsPrefix } from 'src/common/constants';
import { LogController } from 'src/logger/logger.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class KeywordsController {
  constructor(private readonly keywordsService: KeywordsService) {}

  @Get(ControllerMethodsPrefix.oldKeywords)
  @LogController(ControllerMethodsPrefix.oldKeywords)
  async getOldKeywordsList() {
    return await this.keywordsService.getKeywordsListFromOldCollection();
  }

  @Get(ControllerMethodsPrefix.keywords)
  @LogController(ControllerMethodsPrefix.keywords)
  async getKeywordsList() {
    return await this.keywordsService.getAllKeywords();
  }

  @Get(ControllerMethodsPrefix.unusedKeywordsOld)
  @LogController(ControllerMethodsPrefix.unusedKeywordsOld)
  async getUnusedKeywordsOld() {
    return await this.keywordsService.getUnusedKeywordsOld();
  }

  @Get(ControllerMethodsPrefix.unusedKeywords)
  @LogController(ControllerMethodsPrefix.unusedKeywords)
  async getUnusedKeywords() {
    return await this.keywordsService.getUnusedKeywords();
  }

  @Delete(ControllerMethodsPrefix.unusedKeywords)
  @LogController(ControllerMethodsPrefix.unusedKeywords)
  async removeUnusedKeywords() {
    return await this.keywordsService.removeUnusedKeywords();
  }

  @Get(ControllerMethodsPrefix.moveKeywordsToNewCollection)
  @LogController(ControllerMethodsPrefix.moveKeywordsToNewCollection)
  async moveKeywordsToNewCollection() {
    return await this.keywordsService.moveKeywordsToNewCollection();
  }

  @Delete(ControllerMethodsPrefix.keywordsItem)
  @LogController(ControllerMethodsPrefix.keywordsItem)
  async removeUnusedKeyword(@Param('keyword') keyword: string) {
    return await this.keywordsService.removeUnusedKeyword(keyword);
  }
}
