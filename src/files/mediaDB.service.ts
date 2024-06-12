import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MediaTemp } from './entities/media-temp.entity';
import { InjectRepository } from '@nestjs/typeorm';
import type { Tags } from 'exiftool-vendored';
import { toDateUTC } from 'src/common/datesHelper';
import { Media } from './entities/media.entity';
import {
  getDescriptionFromExif,
  getKeywordsFromExif,
  getOriginalDateFromExif,
} from 'src/common/exifHelpers';
import { DEFAULT_TIME_STAMP } from 'src/common/constants';
import type { FilePaths, GetSameFilesIfExist, ProcessFile } from './types';

@Injectable()
export class MediaDB {
  constructor(
    @InjectRepository(MediaTemp)
    private tempRepository: Repository<MediaTemp>,
    @InjectRepository(Media)
    private mediaRepository: Repository<Media>,
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

  async getSameFilesIfExist(where: GetSameFilesIfExist) {
    return this.mediaRepository.find({ where: where });
  }
}
