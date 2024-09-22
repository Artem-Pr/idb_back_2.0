import { Injectable, NotFoundException } from '@nestjs/common';
import { MongoRepository } from 'typeorm';
import { MediaTemp } from './entities/media-temp.entity';
import { InjectRepository } from '@nestjs/typeorm';
import type { Tags } from 'exiftool-vendored';
import { toDateUTC, toMillisecondsUTC } from 'src/common/datesHelper';
import { Media } from './entities/media.entity';
import { ObjectId } from 'mongodb';
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

@Injectable()
export class MediaDBService {
  constructor(
    @InjectRepository(MediaTemp)
    private tempRepository: MongoRepository<MediaTemp>,
    @InjectRepository(Media)
    private mediaRepository: MongoRepository<Media>,
  ) {}

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
    return this.mediaRepository.find({
      where: {
        _id: { $in: ids.map((id) => new ObjectId(id)) },
      },
    });
  }

  async findMediaByIdsInDBTemp(ids: string[]): Promise<MediaTemp[]> {
    return this.tempRepository.find({
      where: {
        _id: { $in: ids.map((id) => new ObjectId(id)) },
      },
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

  async removeMediaFromTempDB(
    ids: Parameters<typeof this.tempRepository.delete>[0],
  ): Promise<void> {
    await this.tempRepository.delete(ids);
  }
}
