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
  Req,
  All,
  Res,
} from '@nestjs/common';
import {
  ControllerPrefix,
  SUPPORTED_MIMETYPE_REGEX,
} from 'src/common/constants';
import { FilesService } from './files.service';
import { FileMediaInterceptor } from './file.interceptor';
import { TusService } from './tus.service';
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
import { MediaDBService } from './mediaDB.service';
import type { UpdateFilesOutputDto } from './dto/update-files-output.dto';
import type { GetFilesWithEmptyExifOutputDto } from './dto/get-files-with-empty-exif-output.dto';
import { MulterFilenamePipe } from 'src/common/validators';

@Controller() // TODO : Define a POST endpoint at /files/uploadItem : @Controller('file')
export class FilesController {
  constructor(
    private filesService: FilesService,
    private mediaDBService: MediaDBService,
    private tusService: TusService,
  ) {}

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
  async updateFiles(
    @Body() filesToUpload: UpdatedFilesInputDto,
  ): Promise<UpdateFilesOutputDto> {
    return this.filesService.updateFiles(filesToUpload);
  }

  @Post(ControllerPrefix.uploadFile)
  @UseInterceptors(FileMediaInterceptor)
  @LogController(ControllerPrefix.uploadFile)
  @HttpCode(HttpStatus.CREATED)
  async uploadFile(
    @UploadedFile(
      new MulterFilenamePipe(),
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
    return this.filesService.processFile({
      ...file,
      filename: file.filename,
      mimetype: file.mimetype,
      originalname: file.originalname,
    });
  }

  @All(`${ControllerPrefix.tus}/*`)
  @LogController(`${ControllerPrefix.tus}/*`)
  async handleNestedTusRequest(@Req() req: Request, @Res() res: Response) {
    const tusResponse = await this.tusService.handle(req, res);

    const fileServiceResponse = await this.filesService.processFile({
      filename: tusResponse.metadata.filename,
      mimetype: tusResponse.metadata.filetype,
      originalname: tusResponse.metadata.originalFilename,
      size: tusResponse.metadata.size,
    });

    tusResponse.res({
      status_code: HttpStatus.CREATED,
      body: JSON.stringify(
        FilesService.applyUTCChangeDateToFileOutput(
          fileServiceResponse,
          tusResponse.metadata.changeDate,
        ),
      ),
    });
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

  @Get(ControllerPrefix.getFilesWithEmptyExif)
  @LogController(ControllerPrefix.getFilesWithEmptyExif)
  async getFilesWithEmptyExif(): Promise<GetFilesWithEmptyExifOutputDto> {
    return this.filesService.getFilesWithEmptyExif();
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

  @Put(ControllerPrefix.updateMediaEntities)
  @HttpCode(HttpStatus.NO_CONTENT)
  @LogController(ControllerPrefix.updateMediaEntities)
  async updateMediaEntities() {
    await this.mediaDBService.updateMediaInOldDBToMakeItValid();
  }
}
