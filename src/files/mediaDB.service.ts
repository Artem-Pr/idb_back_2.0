import { Injectable } from '@nestjs/common';
import type { FileProcessingJob } from 'src/jobs/files.processor';
import { Repository } from 'typeorm';
import { MediaTemp } from './entities/media-temp.entity';
import { InjectRepository } from '@nestjs/typeorm';
import type { Tags } from 'exiftool-vendored';
import { toDateUTC } from 'src/common/datesHelper';
import type {
  DBFilePath,
  DBFullSizePath,
  DBPreviewPath,
  FileNameWithExt,
} from 'src/common/types';
import { Media } from './entities/media.entity';

export interface ProcessFile extends Express.Multer.File {
  filename: FileProcessingJob['fileName'];
  mimetype: FileProcessingJob['fileType'];
  originalname: FileNameWithExt;
}

export interface FilePaths {
  filePath: DBFilePath;
  fullSizePath?: DBFullSizePath;
  previewPath: DBPreviewPath;
}

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
    // нашел много разных вариантов даты, возможно надо их протестировать
    const originalDate =
      exifData.DateTimeOriginal ||
      exifData.CreationDate || //Видео для iPhone с тайм зоной
      exifData.CreateDate ||
      exifData.ModifyDate ||
      exifData.MediaCreateDate;

    // Create a new instance of MediaTemp
    const mediaTemp: MediaTemp = new MediaTemp();

    // mediaTemp.tempName = file.filename;
    mediaTemp.originalName = file.originalname;
    mediaTemp.mimetype = file.mimetype;
    mediaTemp.size = file.size;
    mediaTemp.changeDate = (file as any)?.changeDate; // TODO: fix this
    mediaTemp.megapixels = exifData.Megapixels;
    mediaTemp.imageSize = exifData.ImageSize;
    mediaTemp.keywords = exifData.Keywords || [];
    mediaTemp.originalDate = toDateUTC(originalDate);
    mediaTemp.filePath = filePaths.filePath;
    mediaTemp.preview = filePaths.previewPath;
    mediaTemp.fullSizeJpg = filePaths.fullSizePath;
    mediaTemp.exif = exifData;

    // Optional fields - provide default values or logic to calculate
    mediaTemp.rating = exifData.Rating;
    mediaTemp.description = exifData.Description;

    // Save the new MediaTemp entity to the database
    return await this.tempRepository.save(mediaTemp);
  }

  async getSameFilesIfExist(originalName: FileNameWithExt) {
    return this.mediaRepository.find({ where: { originalName } });
  }
}
