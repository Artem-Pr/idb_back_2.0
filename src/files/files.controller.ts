import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
  BadRequestException,
  Get,
  ValidationPipe,
  UsePipes,
  Query,
  Body,
} from '@nestjs/common';
import { ControllerPrefix } from 'src/common/constants';
import {
  isSupportedExtension,
  isSupportedMimeType,
} from 'src/common/fileNameHelpers';
import { FilesService } from './files.service';
import { FileMediaInterceptor } from './file.interceptor';
import { CheckDuplicatesOriginalNamesInputDto } from './dto/check-duplicates-original-names-input.dto';
import { CheckDuplicatesFilePathsInputDto } from './dto/check-duplicates-file-paths-input.dto';
import type { UploadFileOutputDto } from './dto/upload-file-output.dto';
import type { CheckDuplicatesOriginalNamesOutputDto } from './dto/check-duplicates-original-names-output.dto';
import type { CheckDuplicatesFilePathsOutputDto } from './dto/check-duplicates-file-paths-output.dto';
import type { UpdatedFilesInputDto } from './dto/update-files-input.dto';
import type { GetFilesInputDto } from './dto/get-files-input.dto';
import type { GetFilesOutputDto } from './dto/get-files-output.dto';
import { LogController } from 'src/logger/logger.decorator';

@Controller() // TODO : Define a POST endpoint at /files/uploadItem : @Controller('file')
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Post(ControllerPrefix.getFiles)
  @LogController(ControllerPrefix.getFiles)
  async getFiles(
    @Body() filesQuery: GetFilesInputDto,
  ): Promise<GetFilesOutputDto> {
    return this.filesService.getFiles(filesQuery);
  }

  @Post(ControllerPrefix.saveFiles)
  @LogController(ControllerPrefix.saveFiles)
  async saveFiles(@Body() filesToUpload: UpdatedFilesInputDto) {
    return this.filesService.saveFiles(filesToUpload);
  }

  @Post(ControllerPrefix.uploadFile)
  @UseInterceptors(FileMediaInterceptor)
  @LogController(ControllerPrefix.uploadFile)
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadFileOutputDto> {
    if (!file) {
      throw new BadRequestException('File upload failed');
    }
    if (
      !isSupportedExtension(file.filename) ||
      !isSupportedMimeType(file.mimetype) ||
      !isSupportedExtension(file.originalname)
    ) {
      throw new HttpException(
        'Unsupported file type',
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      );
    }

    return this.filesService
      .processFile({
        ...file,
        filename: file.filename,
        mimetype: file.mimetype,
        originalname: file.originalname,
      })
      .then((response) => response);
  }

  @Get(ControllerPrefix.checkDuplicates)
  @UsePipes(new ValidationPipe())
  @LogController(ControllerPrefix.checkDuplicates)
  async checkDuplicatesByOriginalNames(
    @Query() query: CheckDuplicatesOriginalNamesInputDto,
  ): Promise<CheckDuplicatesOriginalNamesOutputDto> {
    return await this.filesService.getDuplicatesFromMediaDBByOriginalNames(
      query.originalNames,
    );
  }

  @Get(ControllerPrefix.checkDuplicatesByFilePaths)
  @UsePipes(new ValidationPipe())
  @LogController(ControllerPrefix.checkDuplicatesByFilePaths)
  async checkDuplicatesByFilePaths(
    @Query() query: CheckDuplicatesFilePathsInputDto,
  ): Promise<CheckDuplicatesFilePathsOutputDto> {
    return await this.filesService.getDuplicatesFromMediaDBByFilePaths(
      query.filePaths,
    );
  }
}
