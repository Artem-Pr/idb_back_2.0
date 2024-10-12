import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { DeleteResult, MongoRepository } from 'typeorm';
import { uniq } from 'ramda';
import { MediaTemp } from './entities/media-temp.entity';
import { InjectRepository } from '@nestjs/typeorm';
import type { Tags } from 'exiftool-vendored';
import { toDateUTC, toMillisecondsUTC } from 'src/common/datesHelper';
import { Media } from './entities/media.entity';
import {
  getDescriptionFromExif,
  getKeywordsFromExif,
  getOriginalDateFromExif,
} from 'src/common/exifHelpers';
import { DEFAULT_TIME_STAMP } from 'src/common/constants';
import type { FilePaths, GetSameFilesIfExist, ProcessFile } from './types';
import type {
  UpdatedFieldsInputDto,
  UpdatedFilesInputDto,
} from './dto/update-files-input.dto';
import type {
  MongoAggregationPipeline,
  MongoFilterCondition,
} from './mediaDBQueryCreators';
import { MediaDBQueryCreators } from './mediaDBQueryCreators';
import {
  getFullPathWithoutNameAndFirstSlash,
  removeExtraSlashes,
} from 'src/common/fileNameHelpers';
import type { DBFilePath } from 'src/common/types';
import { CustomLogger } from 'src/logger/logger.service';
import type { GetFilesInputDto } from './dto/get-files-input.dto';
import type { GetFilesOutputDto, Pagination } from './dto/get-files-output.dto';

export enum DBType {
  DBTemp = 'temp',
  DBMedia = 'media',
}

export type UpdatedFilesInputObject = Record<
  string,
  Partial<UpdatedFieldsInputDto>
>;

export interface UpdateMedia {
  oldMedia: Media;
  newMedia: Media;
}

export interface GetFilesDBResponse {
  pagination: [Omit<Pagination, 'nPerPage'>] | [];
  response: Media[];
  total: [Pick<GetFilesOutputDto, 'filesSizeSum'>] | [];
}

export type GetFilesResponse = Promise<
  (Omit<GetFilesOutputDto, 'files'> & { files: Media[] }) | undefined
>;

@Injectable()
export class MediaDBService extends MediaDBQueryCreators {
  private readonly logger = new CustomLogger(MediaDBService.name);

  constructor(
    @InjectRepository(MediaTemp)
    private tempRepository: MongoRepository<MediaTemp>,
    @InjectRepository(Media)
    private mediaRepository: MongoRepository<Media>,
  ) {
    super();
  }

  async addFileToDBTemp(
    exifData: Tags,
    filePaths: FilePaths,
    file: ProcessFile,
  ): Promise<MediaTemp> {
    // добавляем в filedata дату создания фоточки (при необходимости)
    const originalDate = getOriginalDateFromExif(exifData);

    // Create a new instance of MediaTemp
    const mediaTemp: MediaTemp = new MediaTemp();

    mediaTemp.changeDate = null;
    mediaTemp.description = getDescriptionFromExif(exifData);
    mediaTemp.exif = exifData;
    mediaTemp.filePath = filePaths.filePath;
    mediaTemp.fullSizeJpg = filePaths.fullSizePath || null;
    mediaTemp.imageSize = exifData.ImageSize || null;
    mediaTemp.keywords = getKeywordsFromExif(exifData);
    mediaTemp.megapixels = exifData.Megapixels || null;
    mediaTemp.mimetype = file.mimetype;
    mediaTemp.originalDate = toDateUTC(originalDate);
    mediaTemp.originalName = file.originalname;
    mediaTemp.preview = filePaths.previewPath;
    mediaTemp.rating = exifData.Rating || null;
    mediaTemp.size = file.size;
    mediaTemp.timeStamp = DEFAULT_TIME_STAMP;

    // Save the new MediaTemp entity to the database
    return await this.tempRepository.save(mediaTemp);
  }

  async addMediaToDB<T extends Media | Media[]>(media: T): Promise<T> {
    return await this.mediaRepository.save(media as any);
  }

  async findMediaByIdsInDB(ids: string[]): Promise<Media[]> {
    return this.mediaRepository.find(this.ormFindByIdsQuery(ids));
  }

  async findMediaByIdsInDBTemp(ids: string[]): Promise<MediaTemp[]> {
    return this.tempRepository.find(this.ormFindByIdsQuery(ids));
  }

  async findMediaByDirectoryInDB(directory: string): Promise<Media[]> {
    const sanitizedDirectory = removeExtraSlashes(directory);

    return this.mediaRepository.find({
      filePath: new RegExp(`^/${sanitizedDirectory}/`),
    });
  }

  async getSameFilesIfExist(where: GetSameFilesIfExist) {
    return this.mediaRepository.find({ where });
  }

  private getUpdatedFilesInputObject(
    filesToUpload: UpdatedFilesInputDto,
  ): UpdatedFilesInputObject {
    return filesToUpload.files.reduce<UpdatedFilesInputObject>((acc, file) => {
      acc[file.id.toString()] = file.updatedFields;
      return acc;
    }, {});
  }

  private updateDBMediaEntity(
    mediaToUpdate: Media,
    updatedFields: Partial<UpdatedFieldsInputDto>,
  ): Media {
    const updatedMedia = new Media();
    updatedMedia._id = mediaToUpdate._id;
    updatedMedia.changeDate = updatedFields.changeDate
      ? toMillisecondsUTC(updatedFields.changeDate)
      : mediaToUpdate.changeDate;
    updatedMedia.description =
      updatedFields.description || mediaToUpdate.description;
    updatedMedia.exif = mediaToUpdate.exif;
    updatedMedia.filePath = updatedFields.filePath || mediaToUpdate.filePath;
    updatedMedia.fullSizeJpg = mediaToUpdate.fullSizeJpg;
    updatedMedia.imageSize = mediaToUpdate.imageSize;
    updatedMedia.keywords = updatedFields.keywords || mediaToUpdate.keywords;
    updatedMedia.megapixels = mediaToUpdate.megapixels;
    updatedMedia.mimetype = mediaToUpdate.mimetype;
    updatedMedia.originalDate = updatedFields.originalDate
      ? toDateUTC(updatedFields.originalDate)
      : mediaToUpdate.originalDate;
    updatedMedia.originalName =
      updatedFields.originalName || mediaToUpdate.originalName;
    updatedMedia.preview = mediaToUpdate.preview;
    updatedMedia.rating = updatedFields.rating || mediaToUpdate.rating;
    updatedMedia.timeStamp = updatedFields.timeStamp || mediaToUpdate.timeStamp;
    updatedMedia.size = mediaToUpdate.size;

    return updatedMedia;
  }

  private validateIfMediaExists(ids: string[], mediaIdList: string[]): boolean {
    const mediaIdSet = new Set(mediaIdList);
    const notExistedIds = ids.filter((id) => !mediaIdSet.has(id));

    if (notExistedIds.length > 0) {
      const missingIds = notExistedIds.map((id) => id.toString()).join(', ');
      throw new NotFoundException(`Ids not found in database: ${missingIds}`);
    }

    return true;
  }

  private async getMediaListByIds(
    ids: string[],
    database: DBType,
  ): Promise<(MediaTemp | Media)[]> {
    const findMediaByIds =
      database === DBType.DBMedia
        ? this.findMediaByIdsInDB.bind(this)
        : this.findMediaByIdsInDBTemp.bind(this);
    const tempDBMediaList = await findMediaByIds(ids);

    this.validateIfMediaExists(
      ids,
      tempDBMediaList.map(({ _id }) => _id.toString()),
    );

    return tempDBMediaList;
  }

  async updateMediaList(
    filesToUpload: UpdatedFilesInputDto,
    database: DBType,
  ): Promise<UpdateMedia[]> {
    const ids = filesToUpload.files.map(({ id }) => id);
    const mediaList = await this.getMediaListByIds(ids, database);
    const updatedFilesInputObject =
      this.getUpdatedFilesInputObject(filesToUpload);

    return mediaList.map((media) => {
      const currentMediaUpdateObject =
        updatedFilesInputObject[media._id.toString()];
      const updatedMedia = this.updateDBMediaEntity(
        media,
        currentMediaUpdateObject,
      );

      return {
        oldMedia: media,
        newMedia: updatedMedia,
      };
    });
  }

  async deleteMediaFromTempDB(
    ids: Parameters<typeof this.tempRepository.delete>[0],
  ): Promise<DeleteResult> {
    return this.tempRepository.delete(ids);
  }

  async deleteMediaFromDB(
    ids: Parameters<typeof this.tempRepository.delete>[0],
  ): Promise<DeleteResult> {
    return this.mediaRepository.delete(ids);
  }

  async countFilesInDirectory(directory: string): Promise<number> {
    const sanitizedDirectory = removeExtraSlashes(directory);

    return this.mediaRepository.count({
      filePath: new RegExp(`^/${sanitizedDirectory}/`),
    });
  }

  private async getFoldersPathsList(
    conditions?: MongoFilterCondition[],
  ): Promise<DBFilePath[]> {
    const filePathListQueryFacet = this.getMongoDynamicFoldersFacet();
    const aggregation = this.createMongoAggregationPipeline({
      conditions,
      facet: filePathListQueryFacet,
    });

    const mongoResponse = await this.makeAggregationQuery<{
      response: [{ filePathSet: DBFilePath[] }];
    }>(aggregation);

    return mongoResponse.response[0]?.filePathSet || [];
  }

  private getUniqPathsRecursively = (paths: string[]) => {
    const getArrayOfSubfolders = (fullPath: string): string[] => {
      const fullPathParts = fullPath.split('/');
      const fullPathWithoutLastFolder = fullPathParts.slice(0, -1).join('/');
      return fullPathParts.length === 1
        ? fullPathParts
        : [...getArrayOfSubfolders(fullPathWithoutLastFolder), fullPath];
    };

    const pathsWithSubfolders = paths
      .reduce<
        string[]
      >((accum, currentPath) => [...accum, ...getArrayOfSubfolders(currentPath)], [])
      .filter(Boolean);
    return Array.from(new Set(pathsWithSubfolders)).sort();
  };

  async getDynamicFoldersRecursively(conditions?: MongoFilterCondition[]) {
    const filePaths = await this.getFoldersPathsList(conditions);
    const folderPathsWithoutNames = filePaths.map((filePath) =>
      getFullPathWithoutNameAndFirstSlash(filePath),
    );

    const dynamicFolders =
      this.getUniqPathsRecursively(uniq(folderPathsWithoutNames)) || [];

    return dynamicFolders;
  }

  async getUsedKeywordsList() {
    const aggregation = this.getMongoUsedKeywordsAggregation();

    const mongoResponse = await this.makeAggregationQuery<{
      response: string[];
    }>(aggregation);

    return mongoResponse.response;
  }

  private getSearchPagination(
    paginationResponse: GetFilesDBResponse['pagination'],
    nPerPage: number,
  ): Pagination {
    if (paginationResponse.length === 0) {
      return {
        currentPage: 1,
        nPerPage,
        resultsCount: 0,
        totalPages: 1,
      };
    }

    const { currentPage, resultsCount, totalPages } = paginationResponse[0];

    return {
      currentPage,
      nPerPage,
      resultsCount,
      totalPages,
    };
  }

  async getFiles({
    filters,
    folders,
    sorting: { sort, randomSort },
    pagination,
  }: GetFilesInputDto): GetFilesResponse {
    try {
      const filtersQuery = this.getMongoFiltersConditions(filters);
      const foldersQuery = this.getMongoFoldersCondition(folders);
      const dynamicFolders = folders?.isDynamicFolders
        ? await this.getDynamicFoldersRecursively(filtersQuery)
        : [];

      const conditionsArr: MongoFilterCondition[] = [
        ...filtersQuery,
        foldersQuery,
      ];

      const aggregation = this.createMongoAggregationPipeline({
        conditions: conditionsArr,
        sorting: sort,
        sample: randomSort ? { size: pagination.perPage } : undefined,
        facet: this.getMongoFilesFacet(pagination),
      });

      const {
        response,
        total,
        pagination: paginationResponse,
      } = await this.makeAggregationQuery<GetFilesDBResponse>(aggregation);

      const DBResponse = {
        dynamicFolders,
        files: response,
        filesSizeSum: total[0]?.filesSizeSum || 0,
        searchPagination: this.getSearchPagination(
          paginationResponse,
          pagination.perPage,
        ),
      };

      return DBResponse;
    } catch (error) {
      this.logger.logError({
        method: 'MediaDBService.getFiles',
        message: error?.message,
        errorData: error,
      });
      throw new InternalServerErrorException(error?.message);
    }
  }

  async makeAggregationQuery<T>(
    aggregationPipeline: MongoAggregationPipeline,
  ): Promise<T> {
    const aggregatedResult = (await this.mediaRepository
      .aggregate(aggregationPipeline, { allowDiskUse: true })
      .toArray()) as unknown as [T];

    return aggregatedResult[0];
  }
}
