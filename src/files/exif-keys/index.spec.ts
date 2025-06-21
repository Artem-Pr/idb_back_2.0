// This file serves as an index for all exif-keys unit tests
// It ensures all tests are discoverable and can be run together

// Import all test suites
import './exif-keys.service.spec';
import './factories/exif-keys.factory.spec';
import './strategies/exif-type-determination.strategy.spec';
import './types/result.type.spec';
import './repositories/exif-keys.repository.spec';

// Test summary:
// - ExifKeysService: Business logic and orchestration (currently has type issues)
// - ExifKeysFactory: Entity creation and mapping
// - ExifTypeDeterminationStrategy: Type determination logic
// - Result Type: Success/failure pattern implementation
// - ExifKeysRepository: Data access layer

export {};
