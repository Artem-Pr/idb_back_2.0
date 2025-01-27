import { exifData as Canon_EOS_60D_exif } from '../../test-data/exifDataMock/Canon_EOS_60D';
import { exifData as Xiaomi_Mi_Note_3_exif } from '../../test-data/exifDataMock/Xiaomi_Mi_Note_3';
import { exifData as PS4_screenshot_exif } from '../../test-data/exifDataMock/PS4_screenshot';
import { exifData as PS4_video_exif } from '../../test-data/exifDataMock/PS4_video';
import { exifData as iPhone_SE_1st_gen_video_from_life_photo_exif } from '../../test-data/exifDataMock/iPhone_SE_1st_gen_video_from_life_photo';
import { exifData as iPhone_12_Pro_exif } from '../../test-data/exifDataMock/iPhone_12_Pro';
import { exifData as iPhone_SE_1st_gen_photo_exif } from '../../test-data/exifDataMock/iPhone_SE_1st_gen_photo';
import { exifData as iPhone_13_photo_exif } from '../../test-data/exifDataMock/iPhone_13_photo';
import { exifData as Xiaomi_Yi_Action_Camera_exif } from '../../test-data/exifDataMock/Xiaomi_Yi_Action_Camera';
import {
  getDescriptionFromExif,
  getKeywordsFromExif,
  getOriginalDateFromExif,
  getVideoDurationInMillisecondsFromExif,
} from './exifHelpers';
import type { Tags } from 'exiftool-vendored';

describe('exifHelpers', () => {
  describe('getDescriptionFromExif', () => {
    it('should return Description if it exists', () => {
      const exif: Tags = { Description: 'Test Description' };
      expect(getDescriptionFromExif(exif)).toBe('Test Description');
    });

    it('should return ImageDescription if Description does not exist', () => {
      const exif: Tags = { ImageDescription: 'Image Description' };
      expect(getDescriptionFromExif(exif)).toBe('Image Description');
    });

    it('should return UserComment if Description and ImageDescription do not exist', () => {
      const exif: Tags = { UserComment: 'User Comment' };
      expect(getDescriptionFromExif(exif)).toBe('User Comment');
    });

    it('should return null if Description, ImageDescription, and UserComment do not exist', () => {
      const exif: Tags = {};
      expect(getDescriptionFromExif(exif)).toBe(null);
    });
  });

  describe('getKeywordsFromExif', () => {
    it('should return an array of keywords if Subject exists', () => {
      const exif: Tags = { Subject: ['keyword1', 'keyword2'] };
      expect(getKeywordsFromExif(exif)).toEqual(['keyword1', 'keyword2']);
    });

    it('should return an array of keywords if Keywords exists', () => {
      const exif: Tags = { Keywords: ['keyword1', 'keyword2'] };
      expect(getKeywordsFromExif(exif)).toEqual(['keyword1', 'keyword2']);
    });

    it('should split string keywords by "." if Keywords is a string', () => {
      const exif: Tags = { Keywords: 'keyword1.keyword2' };
      expect(getKeywordsFromExif(exif)).toEqual(['keyword1', 'keyword2']);
    });

    it('should return an empty array if Keywords does not exist', () => {
      const exif: Tags = {};
      expect(getKeywordsFromExif(exif)).toEqual([]);
    });
  });

  describe('getOriginalDateFromExif', () => {
    it('should return DateCreated for Canon EOS 60D', () => {
      const exif = Canon_EOS_60D_exif;

      expect(getOriginalDateFromExif(exif as any)).toEqual(
        new Date('2019-09-19T21:21:26.130Z'),
      );
    });

    it('should return SubSecModifyDate for Xiaomi Mi Note 3', () => {
      const exif = Xiaomi_Mi_Note_3_exif;

      expect(getOriginalDateFromExif(exif as any)).toEqual(
        new Date('2021-12-06T10:26:49.366Z'),
      );
    });

    it('should return CreateDate for PS4 screenshots', () => {
      const exif = PS4_screenshot_exif;

      expect(getOriginalDateFromExif(exif as any)).toEqual(
        new Date('2022-04-20T16:20:00.000Z'),
      );
    });

    it('should return TrackCreateDate for PS4 video', () => {
      const exif = PS4_video_exif;

      expect(getOriginalDateFromExif(exif as any)).toEqual(
        new Date('2022-05-07T09:07:48.000Z'),
      );
    });

    it('should return SubSecCreateDate for "iPhone SE 1st gen" photo', () => {
      const exif = iPhone_SE_1st_gen_photo_exif;

      expect(getOriginalDateFromExif(exif as any)).toEqual(
        new Date('2022-09-03T12:06:30.841Z'),
      );
    });

    it('should return CreateDate for "iPhone SE 1st gen" video from life photo', () => {
      const exif = iPhone_SE_1st_gen_video_from_life_photo_exif;

      expect(getOriginalDateFromExif(exif as any)).toEqual(
        new Date('2019-05-18T12:10:18.000Z'),
      );
    });

    it('should return SubSecCreateDate for iPhone 12 Pro photo', () => {
      const exif = iPhone_12_Pro_exif;

      expect(getOriginalDateFromExif(exif as any)).toEqual(
        new Date('2023-07-02T15:59:47.929Z'),
      );
    });

    it('should return SubSecCreateDate for iPhone 13 photo', () => {
      const exif = iPhone_13_photo_exif;

      expect(getOriginalDateFromExif(exif as any)).toEqual(
        new Date('2023-07-02T14:51:58.508Z'),
      );
    });

    it('should return DateTimeOriginal for Xiaomi_Yi_Action_Camera photo', () => {
      const exif = Xiaomi_Yi_Action_Camera_exif;

      expect(getOriginalDateFromExif(exif as any)).toEqual(
        new Date('2019-01-12T12:00:00.000Z'),
      );
    });
  });

  describe('getVideoDurationInMillisecondsFromExif', () => {
    it('should return the duration in milliseconds when Duration field is present', () => {
      const exif = iPhone_SE_1st_gen_video_from_life_photo_exif;
      const result = getVideoDurationInMillisecondsFromExif(exif as any);
      expect(result).toBe(2468.3333333333303);
    });

    it('should return null when no duration field is present', () => {
      const exif: Tags = {};
      const result = getVideoDurationInMillisecondsFromExif(exif);
      expect(result).toBeNull();
    });

    it('should return the duration in milliseconds when TrackDuration field is present, if Duration field is not present', () => {
      const exif: Tags = {
        TrackDuration: 10,
        MediaDuration: 7.25,
      };
      const result = getVideoDurationInMillisecondsFromExif(exif);
      expect(result).toBe(10000);
    });

    it('should return the duration in milliseconds when MediaDuration field is present', () => {
      const exif: Tags = {
        MediaDuration: 7.25,
      };
      const result = getVideoDurationInMillisecondsFromExif(exif);
      expect(result).toBe(7250);
    });

    it('Should return correct duration if Duration is a string', () => {
      const exif = {
        Duration: '10',
      };
      const result = getVideoDurationInMillisecondsFromExif(exif as any);
      expect(result).toBe(10000);
    });
  });
});
