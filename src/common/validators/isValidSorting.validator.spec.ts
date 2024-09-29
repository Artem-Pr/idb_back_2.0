import { registerDecorator } from 'class-validator';
import {
  IsValidSorting,
  IsValidSortingConstraint,
} from './isValidSorting.validator';
import type { SortingObject } from 'src/files/types';
import { Sort, SortingFields } from 'src/files/types';

jest.mock('class-validator', () => {
  const originalModule = jest.requireActual('class-validator');
  return {
    ...originalModule,
    registerDecorator: jest.fn(),
  };
});

describe('IsValidSortingValidator', () => {
  describe('IsValidSortingConstraint', () => {
    let validator: IsValidSortingConstraint;

    beforeEach(() => {
      validator = new IsValidSortingConstraint();
    });

    describe('validate', () => {
      it('should return true for a valid sorting object', () => {
        const validSorting: SortingObject = {
          [SortingFields.id]: Sort.ASC,
          [SortingFields.originalName]: Sort.DESC,
        };
        const result = validator.validate(validSorting);
        expect(result).toBe(true);
      });

      it('Should return true if sorting is undefined', () => {
        const result = validator.validate();
        expect(result).toBe(true);
      });

      it('should return false for a sorting object with an invalid field', () => {
        const invalidSorting: SortingObject = {
          invalidField: Sort.ASC,
        } as any;
        const result = validator.validate(invalidSorting);
        expect(result).toBe(false);
        expect(validator.errorType).toBe('field');
        expect(validator.fieldNameWithError).toBe('invalidField');
      });

      it('should return false for a sorting object with an invalid sort order', () => {
        const invalidSorting: SortingObject = {
          [SortingFields.id]: 'INVALID' as any,
        };
        const result = validator.validate(invalidSorting);
        expect(result).toBe(false);
        expect(validator.errorType).toBe('format');
        expect(validator.fieldNameWithError).toBe('_id');
      });
    });

    describe('defaultMessage', () => {
      it('should return the default error message for invalid field', () => {
        validator.errorType = 'field';
        validator.fieldNameWithError = 'invalidField';
        const message = validator.defaultMessage();
        expect(message).toBe(
          'Sorting field is not supported. Wrong field: invalidField',
        );
      });

      it('should return the default error message for invalid format', () => {
        validator.errorType = 'format';
        validator.fieldNameWithError = 'id';
        const message = validator.defaultMessage();
        expect(message).toBe(
          'Sorting format is not supported. Wrong field: id',
        );
      });
    });
  });

  describe('IsValidSorting', () => {
    it('should register the decorator with the correct properties', () => {
      const validationOptions = { message: 'Test Message' };
      const targetObject = new (class {
        someProperty: string;
      })();
      const propertyName = 'someProperty';

      IsValidSorting(validationOptions)(targetObject, propertyName);

      expect(registerDecorator).toHaveBeenCalledWith({
        propertyName: propertyName,
        target: targetObject.constructor,
        options: validationOptions,
        constraints: [],
        validator: IsValidSortingConstraint,
      });
    });

    it('should register the decorator without validation options when not provided', () => {
      const targetObject = new (class {
        someProperty: string;
      })();
      const propertyName = 'someProperty';

      IsValidSorting()(targetObject, propertyName);

      expect(registerDecorator).toHaveBeenCalledWith({
        propertyName: propertyName,
        target: targetObject.constructor,
        options: undefined,
        constraints: [],
        validator: IsValidSortingConstraint,
      });
    });
  });
});
