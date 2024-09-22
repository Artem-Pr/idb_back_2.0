import { getKeywordsFromMediaList } from './keywordsHelpers';
import { Media } from 'src/files/entities/media.entity';

describe('getKeywordsFromMediaList', () => {
  const testMedia1 = new Media();
  const testMedia2 = new Media();
  const testMedia3 = new Media();
  const mediaList = [testMedia1, testMedia2, testMedia3];

  const fillKeywords = () => {
    testMedia1.keywords = ['nestjs', 'typescript'];
    testMedia2.keywords = ['testing'];
    testMedia3.keywords = null;
  };

  const removeKeywords = () => {
    testMedia1.keywords = null;
    testMedia2.keywords = null;
    testMedia3.keywords = null;
  };

  beforeEach(fillKeywords);
  afterEach(removeKeywords);

  it('should return an empty array if mediaList is empty', () => {
    const result = getKeywordsFromMediaList([]);
    expect(result).toEqual([]);
  });

  it('should return an array of keywords from mediaList', () => {
    const result = getKeywordsFromMediaList(mediaList);
    expect(result).toEqual(['nestjs', 'typescript', 'testing']);
  });

  it('should handle media items with no keywords', () => {
    removeKeywords();
    const result = getKeywordsFromMediaList(mediaList);
    expect(result).toEqual([]);
  });

  it('should return only unique keywords', () => {
    testMedia1.keywords = ['nestjs', 'typescript', 'testing', 'typescript'];
    testMedia2.keywords = ['nestjs', 'typescript', 'testing'];
    testMedia3.keywords = ['typescript'];

    const result = getKeywordsFromMediaList(mediaList);
    expect(result).toEqual(['nestjs', 'typescript', 'testing']);
  });
});
