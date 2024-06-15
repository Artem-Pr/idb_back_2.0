import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsValidTimeStampConstraint
  implements ValidatorConstraintInterface
{
  validate(timeString: string): boolean {
    // This regex matches a time format of HH:mm:ss.SSS where HH is 00-23, mm is 00-59, ss is 00-59, and SSS is 000-999
    const regex = /^(2[0-3]|[01]?[0-9]):([0-5]?[0-9]):([0-5]?[0-9])\.[0-9]{3}$/;
    return regex.test(timeString);
  }

  defaultMessage(): string {
    return 'timeStamp must be in the format HH:mm:ss.SSS';
  }
}

export function IsValidTimeStamp(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      propertyName: propertyName,
      target: object.constructor,
      options: validationOptions,
      constraints: [],
      validator: IsValidTimeStampConstraint,
    });
  };
}
