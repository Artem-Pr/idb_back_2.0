import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { BulkWriteResult, DeleteResult, MongoRepository } from 'typeorm';
import { isEmpty, omit, uniq } from 'ramda';
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
import type {
  FilePaths,
  GetSameFilesIfExist,
  ProcessFile,
  SortingObject,
} from './types';
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
  escapeFilePathForRegex,
  getFullPathWithoutNameAndFirstSlash,
  getUniqPathsRecursively,
  isSupportedVideoMimeType,
  removeExtraSlashes,
} from 'src/common/fileNameHelpers';
import type { DBFilePath } from 'src/common/types';
import { CustomLogger } from 'src/logger/logger.service';
import type {
  GetFilesInputDto,
  GetFilesSortInputDto,
} from './dto/get-files-input.dto';
import type { GetFilesOutputDto, Pagination } from './dto/get-files-output.dto';
import { LogMethod } from 'src/logger/logger.decorator';
import { decodeString } from 'src/common/utils';
import { resolveAllSettled } from 'src/common/customPromise';
import { GetFilesDescriptionsInputDto } from './dto/get-files-descriptions-input.dto';

export enum DBType {
  DBTemp = 'temp',
  DBMedia = 'media',
}

export const sortingFieldList = [
  '_id',
  'originalName',
  'mimetype',
  'size',
  'megapixels',
  'originalDate',
  'filePath',
  'rating',
  'description',
] as const;

export type SortingFieldList = keyof Pick<
  Media,
  (typeof sortingFieldList)[number]
>;

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

export type PreviewListEntity = Pick<Media, '_id' | 'fullSizeJpg' | 'preview'>;

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
    const originalDate = getOriginalDateFromExif(exifData);

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
    mediaTemp.originalName = decodeString(file.originalname);
    mediaTemp.preview = filePaths.previewPath;
    mediaTemp.rating = exifData.Rating || null;
    mediaTemp.size = file.size;
    mediaTemp.timeStamp = isSupportedVideoMimeType(file.mimetype)
      ? DEFAULT_TIME_STAMP
      : null;

    return await this.tempRepository.save(mediaTemp);
  }

  @LogMethod('mediaRepository.save.addMediaToDB')
  async addMediaToDB<T extends Media | Media[]>(media: T): Promise<T> {
    return await this.mediaRepository.save(media as any);
  }

  @LogMethod('mediaRepository.bulkWrite.updateMediaInDB')
  async updateMediaInDB(mediaList: Partial<Media>[]): Promise<BulkWriteResult> {
    return this.mediaRepository.bulkWrite(this.getUpdateMediaQuery(mediaList));
  }

  @LogMethod('mediaRepository.bulkWrite.replaceMediaInDB')
  async replaceMediaInDB(mediaList: Media[]): Promise<BulkWriteResult> {
    return this.mediaRepository.bulkWrite(
      this.getReplacementMediaQuery(mediaList),
    );
  }

  @LogMethod('mediaRepository.find.findMediaByIdsInDB')
  async findMediaByIdsInDB(ids: string[]): Promise<Media[]> {
    return this.mediaRepository.find(this.ormFindByIdsQuery(ids));
  }

  @LogMethod('tempRepository.find.findMediaByIdsInDBTemp')
  async findMediaByIdsInDBTemp(ids: string[]): Promise<MediaTemp[]> {
    return this.tempRepository.find(this.ormFindByIdsQuery(ids));
  }

  async findMediaByDirectoryInDB(directory: string): Promise<Media[]> {
    const sanitizedDirectory = removeExtraSlashes(directory);
    const escapedDirectory = escapeFilePathForRegex(sanitizedDirectory);

    return this.mediaRepository.find({
      filePath: new RegExp(`^/${escapedDirectory}/`),
    });
  }

  async findMediaWithEmptyExifInDB(): Promise<Pick<Media, 'filePath'>[]> {
    return this.mediaRepository.find({
      where: {
        $or: [{ exif: { $exists: false } }, { exif: { $eq: {} } }],
      },
      select: ['filePath'],
    }) as Promise<Pick<Media, 'filePath'>[]>;
  }

  /**
   * Efficiently retrieves media exif data in batches to prevent memory issues
   * @param batchSize Number of entities to process at once (default: 1000)
   * @param offset Starting offset for pagination
   */
  @LogMethod('mediaRepository.find.findMediaExifBatch')
  async findMediaExifBatch(
    batchSize: number = 1000,
    offset: number = 0,
  ): Promise<Pick<Media, '_id' | 'exif'>[]> {
    return this.mediaRepository.find({
      select: ['_id', 'exif'],
      skip: offset,
      take: batchSize,
    }) as Promise<Pick<Media, '_id' | 'exif'>[]>;
  }

  /**
   * Get total count of media entities for batch processing
   */
  @LogMethod('mediaRepository.count.countAllMedia')
  async countAllMedia(): Promise<number> {
    return this.mediaRepository.count();
  }

  @LogMethod('mediaRepository.find.findNotEmptyPreviewsInDB')
  async findNotEmptyPreviewsInDB() {
    return this.mediaRepository.find({
      where: {
        $and: [
          { preview: { $exists: true } },
          { preview: { $ne: null } },
          { preview: { $ne: '' } },
        ],
      },
      select: ['_id', 'fullSizeJpg', 'preview'],
    }) as Promise<PreviewListEntity[]>;
  }

  @LogMethod('mediaRepository.find.findFilePathsForMediaInFolder')
  async findFilePathsForMediaInFolder({
    mimeTypes,
    folderPath,
  }: {
    mimeTypes?: Media['mimetype'][];
    folderPath?: string;
  }): Promise<Pick<Media, '_id' | 'filePath'>[]> {
    return this.mediaRepository.find({
      where: this.getMongoFilesCondition({
        folderPath,
        mimeTypes,
      }),
      select: ['_id', 'filePath'],
    }) as Promise<Pick<Media, '_id' | 'filePath'>[]>;
  }

  @LogMethod('mediaRepository.find.findEmptyPreviewsInDB')
  async findEmptyPreviewsInDB({
    mimeTypes,
    folderPath,
  }: {
    mimeTypes?: Media['mimetype'][];
    folderPath?: string;
  }): Promise<Media[]> {
    const requestToCheckPreviewsOnly = {
      where: this.getMongoEmptyPreviewsCondition(mimeTypes, folderPath),
    };

    const requestForHeicAndVideos = {
      where: this.getMongoEmptyFullSizesCondition(mimeTypes, folderPath),
    };

    if (requestForHeicAndVideos.where !== null) {
      const notHeicImagesPromise = this.mediaRepository.find(
        requestToCheckPreviewsOnly,
      );

      const heicAndVideosPromise = this.mediaRepository.find(
        requestForHeicAndVideos,
      );

      const mediaFilesWithEmptyPreviews = (
        await resolveAllSettled([notHeicImagesPromise, heicAndVideosPromise])
      ).flat();

      const mediaFilesWithoutDuplicates: Media[] = [];
      mediaFilesWithEmptyPreviews.forEach((mediaFile) => {
        if (
          !mediaFilesWithoutDuplicates.some(
            ({ _id }) => _id.toHexString() === mediaFile._id.toHexString(),
          )
        ) {
          mediaFilesWithoutDuplicates.push(mediaFile);
        }
      });

      return mediaFilesWithoutDuplicates;
    }

    return await this.mediaRepository.find(requestToCheckPreviewsOnly);
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
      updatedFields.description ?? mediaToUpdate.description;
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
    updatedMedia.rating = updatedFields.rating ?? mediaToUpdate.rating;
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
    const findMediaListByIds = async (): Promise<(Media | MediaTemp)[]> => {
      if (database === DBType.DBMedia) {
        return this.findMediaByIdsInDB(ids);
      }

      if (database === DBType.DBTemp) {
        return this.findMediaByIdsInDBTemp(ids);
      }

      return [];
    };

    const tempDBMediaList = await findMediaListByIds();

    this.validateIfMediaExists(
      ids,
      tempDBMediaList.map(({ _id }) => _id.toHexString()),
    );

    return tempDBMediaList;
  }

  async getUpdatedMediaList(
    filesToUpload: UpdatedFilesInputDto,
    database: DBType,
  ): Promise<UpdateMedia[]> {
    const ids = filesToUpload.files.map(({ id }) => id);
    const mediaList = await this.getMediaListByIds(ids, database);
    const updatedFilesInputObject =
      this.getUpdatedFilesInputObject(filesToUpload);

    return mediaList.map((media) => {
      const currentMediaUpdateObject =
        updatedFilesInputObject[media._id.toHexString()];
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

  async emptyTempDB(): Promise<DeleteResult> {
    return this.tempRepository.delete({});
  }

  async countFilesInDirectory(directory: string): Promise<number> {
    const sanitizedDirectory = removeExtraSlashes(directory);
    const escapedDirectory = escapeFilePathForRegex(sanitizedDirectory);
    return this.mediaRepository.count({
      filePath: new RegExp(`^/${escapedDirectory}/`),
    });
  }

  async getFoldersPathsList(
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

    return mongoResponse?.response[0]?.filePathSet || [];
  }

  async getDynamicFoldersRecursively(conditions?: MongoFilterCondition[]) {
    const filePaths = await this.getFoldersPathsList(conditions);
    const folderPathsWithoutNames = filePaths.map((filePath) =>
      getFullPathWithoutNameAndFirstSlash(filePath),
    );

    const dynamicFolders =
      getUniqPathsRecursively(uniq(folderPathsWithoutNames)) || [];

    return dynamicFolders;
  }

  async getUsedKeywordsList(): Promise<string[]> {
    const aggregation = this.getMongoUsedKeywordsAggregation();

    const mongoResponse = await this.makeAggregationQuery<{
      response: string[];
    }>(aggregation);

    return mongoResponse?.response || [];
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

  private getSortingObjectFromSortInputDto(
    sort: GetFilesSortInputDto['sort'],
  ): SortingObject | undefined {
    if (!sort?.id) return sort;

    return { ...omit(['id'], sort), _id: sort.id };
  }

  async getFiles({
    filters,
    folders,
    sorting: { sort, randomSort },
    pagination,
  }: GetFilesInputDto): GetFilesResponse {
    try {
      const foldersConditions = this.getMongoFoldersCondition(folders);
      const filtersConditions = this.getMongoFiltersConditions(filters);
      const allConditions =
        foldersConditions && !isEmpty(foldersConditions)
          ? [...filtersConditions, foldersConditions]
          : filtersConditions;

      const dynamicFolders = folders?.isDynamicFolders
        ? await this.getDynamicFoldersRecursively(allConditions)
        : [];

      const aggregation = this.createMongoAggregationPipeline({
        conditions: allConditions,
        sorting: this.getSortingObjectFromSortInputDto(sort),
        sample: randomSort ? { size: pagination.perPage } : undefined,
        facet: this.getMongoFilesFacet(pagination),
      });

      const aggregationResponse =
        await this.makeAggregationQuery<GetFilesDBResponse>(aggregation);

      const DBResponse: Awaited<GetFilesResponse> = {
        dynamicFolders,
        files: aggregationResponse?.response || [],
        filesSizeSum: aggregationResponse?.total[0]?.filesSizeSum || 0,
        searchPagination: this.getSearchPagination(
          aggregationResponse?.pagination || [],
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

  async deleteMediaByDirectory(sanitizedDirectory: string): Promise<Media[]> {
    const mediaList = await this.findMediaByDirectoryInDB(sanitizedDirectory);
    await this.deleteMediaFromDB(mediaList.map((media) => media._id));

    return mediaList;
  }

  async deleteMediaByIds(ids: string[]): Promise<Media[]> {
    const mediaList = await this.getMediaListByIds(ids, DBType.DBMedia);
    await this.deleteMediaFromDB(mediaList.map((media) => media._id));

    return mediaList;
  }

  async makeAggregationQuery<T>(
    aggregationPipeline: MongoAggregationPipeline,
  ): Promise<T | undefined> {
    const aggregatedResult = (await this.mediaRepository
      .aggregate(aggregationPipeline, { allowDiskUse: true })
      .toArray()) as unknown as [T];

    return aggregatedResult[0];
  }

  async updateMediaInOldDBToMakeItValid(): Promise<BulkWriteResult> {
    const mediaList = await this.mediaRepository.find({
      exif: { $exists: false },
    });

    const updatedMediaList = mediaList.map((media) => {
      const updatedMedia = new Media();
      updatedMedia._id = media._id;
      updatedMedia.changeDate = media.changeDate;
      updatedMedia.description = media.description || null;
      updatedMedia.exif = {};
      updatedMedia.filePath = media.filePath;
      updatedMedia.fullSizeJpg = media.fullSizeJpg || null;
      updatedMedia.imageSize = media.imageSize;
      updatedMedia.keywords = media.keywords;
      updatedMedia.megapixels = media.megapixels;
      updatedMedia.mimetype = media.mimetype;
      updatedMedia.originalDate = media.originalDate;
      updatedMedia.originalName = media.originalName;
      updatedMedia.preview = media.preview;
      updatedMedia.rating = media.rating || null;
      updatedMedia.timeStamp = media.timeStamp || null;
      updatedMedia.size = media.size;

      return updatedMedia;
    });

    return this.replaceMediaInDB(updatedMediaList);
  }

  @LogMethod()
  async getFilesDescriptions({
    descriptionPart,
    page = 1,
    perPage = 10,
  }: GetFilesDescriptionsInputDto): Promise<{
    descriptions: string[];
    totalCount: number;
  }> {
    try {
      const aggregation = this.getMongoFilesDescriptionsAggregation(
        descriptionPart,
        page,
        perPage,
      );

      const result = await this.makeAggregationQuery<{
        descriptions: { description: string }[];
        totalCount: { count: number }[];
      }>(aggregation);

      if (!result) {
        this.logger.debug('No results found');
        return {
          descriptions: [],
          totalCount: 0,
        };
      }

      return {
        descriptions: result.descriptions.map((d) => d.description),
        totalCount: result.totalCount[0]?.count || 0,
      };
    } catch (error) {
      this.logger.logError({
        method: 'MediaDBService.getFilesDescriptions',
        message: error?.message,
        errorData: error,
      });
      throw new InternalServerErrorException(error?.message);
    }
  }
}
