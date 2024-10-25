import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
  Get,
  ValidationPipe,
  UsePipes,
  Query,
  Body,
  Delete,
  ParseFilePipeBuilder,
  HttpCode,
  Put,
} from '@nestjs/common';
import {
  ControllerPrefix,
  SUPPORTED_MIMETYPE_REGEX,
} from 'src/common/constants';
import { FilesService } from './files.service';
import { FileMediaInterceptor } from './file.interceptor';
import { CheckDuplicatesOriginalNamesInputDto } from './dto/check-duplicates-original-names-input.dto';
import { CheckDuplicatesFilePathsInputDto } from './dto/check-duplicates-file-paths-input.dto';
import { UploadFileOutputDto } from './dto/upload-file-output.dto';
import { CheckDuplicatesOriginalNamesOutputDto } from './dto/check-duplicates-original-names-output.dto';
import { CheckDuplicatesFilePathsOutputDto } from './dto/check-duplicates-file-paths-output.dto';
import { UpdatedFilesInputDto } from './dto/update-files-input.dto';
import { GetFilesInputDto } from './dto/get-files-input.dto';
import { GetFilesOutputDto } from './dto/get-files-output.dto';
import { LogController } from 'src/logger/logger.decorator';
import { FileUploadDto } from './dto/upload-file-input.dto';
import { DeleteFilesInputDto } from './dto/delete-files-input.dto';

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

  @Put(ControllerPrefix.updateFiles)
  @LogController(ControllerPrefix.updateFiles)
  async updateFiles(@Body() filesToUpload: UpdatedFilesInputDto) {
    return this.filesService.updateFiles(filesToUpload);
  }

  @Post(ControllerPrefix.uploadFile)
  @UseInterceptors(FileMediaInterceptor)
  @LogController(ControllerPrefix.uploadFile)
  @HttpCode(HttpStatus.CREATED)
  async uploadFile(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: SUPPORTED_MIMETYPE_REGEX })
        .build({
          exceptionFactory(error) {
            throw new HttpException(error, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
          },
        }),
    )
    file: Express.Multer.File & FileUploadDto,
  ): Promise<UploadFileOutputDto> {
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

  @Post(ControllerPrefix.deleteFiles)
  @HttpCode(HttpStatus.NO_CONTENT)
  @LogController(ControllerPrefix.deleteFiles)
  async deleteFiles(@Body() idsQuery: DeleteFilesInputDto): Promise<void> {
    await this.filesService.deleteFilesByIds(idsQuery.ids);
  }

  @Delete(ControllerPrefix.cleanTemp)
  @HttpCode(HttpStatus.NO_CONTENT)
  @LogController(ControllerPrefix.cleanTemp)
  async cleanTemp() {
    return this.filesService.cleanTemp();
  }
}
