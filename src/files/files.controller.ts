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
  UseGuards,
} from '@nestjs/common';
import {
  ControllerMethodsPrefix,
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
import { GetFilesDescriptionsInputDto } from './dto/get-files-descriptions-input.dto';
import { GetFilesDescriptionsOutputDto } from './dto/get-files-descriptions-output.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { GetExifValuesInputDto } from './exif-values/dto/get-exif-values-input.dto';
import { GetExifValuesOutputDto } from './exif-values/dto/get-exif-values-output.dto';
import { GetExifValuesHandler } from './exif-values/handlers/get-exif-values.handler';
import { GetExifValueRangeInputDto } from './exif-values/dto/get-exif-value-range-input.dto';
import { GetExifValueRangeOutputDto } from './exif-values/dto/get-exif-value-range-output.dto';
import { GetExifValueRangeHandler } from './exif-values/handlers/get-exif-value-range.handler';

@Controller() // TODO : Define a POST endpoint at /files/uploadItem : @Controller('file')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(
    private filesService: FilesService,
    private mediaDBService: MediaDBService,
    private tusService: TusService,
    private getExifValuesHandler: GetExifValuesHandler,
    private getExifValueRangeHandler: GetExifValueRangeHandler,
  ) {}

  @Post(ControllerMethodsPrefix.getFiles)
  @HttpCode(HttpStatus.OK)
  @LogController(ControllerMethodsPrefix.getFiles)
  async getFiles(
    @Body() filesQuery: GetFilesInputDto,
  ): Promise<GetFilesOutputDto> {
    return this.filesService.getFiles(filesQuery);
  }

  @Post(ControllerMethodsPrefix.saveFiles)
  @LogController(ControllerMethodsPrefix.saveFiles)
  async saveFiles(@Body() filesToUpload: UpdatedFilesInputDto) {
    return this.filesService.saveFiles(filesToUpload);
  }

  @Put(ControllerMethodsPrefix.updateFiles)
  @LogController(ControllerMethodsPrefix.updateFiles)
  async updateFiles(
    @Body() filesToUpload: UpdatedFilesInputDto,
  ): Promise<UpdateFilesOutputDto> {
    return this.filesService.updateFiles(filesToUpload);
  }

  @Post(ControllerMethodsPrefix.uploadFile)
  @UseInterceptors(FileMediaInterceptor)
  @HttpCode(HttpStatus.CREATED)
  @LogController(ControllerMethodsPrefix.uploadFile)
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

  @All(`${ControllerMethodsPrefix.tus}/*`)
  @LogController(`${ControllerMethodsPrefix.tus}/*`)
  async handleNestedTusRequest(@Req() req: Request, @Res() res: Response) {
    const tusResponse = await this.tusService.handle(req, res);

    try {
      const fileServiceResponse = await this.filesService.processFile({
        filename: tusResponse.metadata.filename,
        mimetype: tusResponse.metadata.filetype,
        originalname: tusResponse.metadata.originalFilename,
        size: tusResponse.metadata.size,
      });

      tusResponse.resolve({
        status_code: HttpStatus.CREATED,
        body: JSON.stringify(
          FilesService.applyUTCChangeDateToFileOutput(
            fileServiceResponse,
            tusResponse.metadata.changeDate,
          ),
        ),
      });
    } catch (error) {
      tusResponse.reject(error);
    }
  }

  @Get(ControllerMethodsPrefix.getFilesDescriptions)
  @LogController(ControllerMethodsPrefix.getFilesDescriptions)
  @UsePipes(new ValidationPipe())
  async getFilesDescriptions(
    @Query() query: GetFilesDescriptionsInputDto,
  ): Promise<GetFilesDescriptionsOutputDto> {
    return this.filesService.getFilesDescriptions(query);
  }

  @Get(ControllerMethodsPrefix.exifValues)
  @LogController(ControllerMethodsPrefix.exifValues)
  @UsePipes(new ValidationPipe({ transform: true }))
  async getExifValues(
    @Query() query: GetExifValuesInputDto,
  ): Promise<GetExifValuesOutputDto> {
    return this.getExifValuesHandler.handle(query);
  }

  @Get(ControllerMethodsPrefix.exifValueRange)
  @LogController(ControllerMethodsPrefix.exifValueRange)
  @UsePipes(new ValidationPipe({ transform: true }))
  async getExifValueRange(
    @Query() query: GetExifValueRangeInputDto,
  ): Promise<GetExifValueRangeOutputDto> {
    return this.getExifValueRangeHandler.handle(query);
  }

  @Get(ControllerMethodsPrefix.checkDuplicates)
  @UsePipes(new ValidationPipe())
  @LogController(ControllerMethodsPrefix.checkDuplicates)
  async checkDuplicatesByOriginalNames(
    @Query() query: CheckDuplicatesOriginalNamesInputDto,
  ): Promise<CheckDuplicatesOriginalNamesOutputDto> {
    return await this.filesService.getDuplicatesFromMediaDBByOriginalNames(
      query.originalNames,
    );
  }

  @Get(ControllerMethodsPrefix.checkDuplicatesByFilePaths)
  @UsePipes(new ValidationPipe())
  @LogController(ControllerMethodsPrefix.checkDuplicatesByFilePaths)
  async checkDuplicatesByFilePaths(
    @Query() query: CheckDuplicatesFilePathsInputDto,
  ): Promise<CheckDuplicatesFilePathsOutputDto> {
    return await this.filesService.getDuplicatesFromMediaDBByFilePaths(
      query.filePaths,
    );
  }

  @Get(ControllerMethodsPrefix.getFilesWithEmptyExif)
  @LogController(ControllerMethodsPrefix.getFilesWithEmptyExif)
  async getFilesWithEmptyExif(): Promise<GetFilesWithEmptyExifOutputDto> {
    return this.filesService.getFilesWithEmptyExif();
  }

  @Post(ControllerMethodsPrefix.deleteFiles)
  @HttpCode(HttpStatus.NO_CONTENT)
  @LogController(ControllerMethodsPrefix.deleteFiles)
  async deleteFiles(@Body() idsQuery: DeleteFilesInputDto): Promise<void> {
    await this.filesService.deleteFilesByIds(idsQuery.ids);
  }

  @Delete(ControllerMethodsPrefix.cleanTemp)
  @HttpCode(HttpStatus.NO_CONTENT)
  @LogController(ControllerMethodsPrefix.cleanTemp)
  async cleanTemp() {
    return this.filesService.cleanTemp();
  }

  @Put(ControllerMethodsPrefix.updateMediaEntities)
  @HttpCode(HttpStatus.NO_CONTENT)
  @LogController(ControllerMethodsPrefix.updateMediaEntities)
  async updateMediaEntities() {
    await this.mediaDBService.updateMediaInOldDBToMakeItValid();
  }
}
