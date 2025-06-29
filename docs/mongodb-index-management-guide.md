# MongoDB Index Management Guide

## 📁 Files Created in This Session

This guide includes several files that were created to address the MongoDB index conflict issue:

### **Core Files**
| File | Purpose | Location |
|------|---------|----------|
| `scripts/manual-index-fix.js` | Manual MongoDB script to fix index conflicts and update schema | `./scripts/manual-index-fix.js` |
| `src/migrations/1703876400000-UpdateExifKeysEntity.ts` | TypeORM migration file for automated schema changes | `./src/migrations/1703876400000-UpdateExifKeysEntity.ts` |
| `migration.config.ts` | TypeORM configuration for running migrations with MongoDB | `./migration.config.ts` |
| `docs/mongodb-index-management-guide.md` | This comprehensive guide (current file) | `./docs/mongodb-index-management-guide.md` |

### **Modified Files**
| File | Changes | Purpose |
|------|---------|---------|
| `package.json` | Added migration scripts | Enable TypeORM migration commands |

### **Usage Summary**
- **For Quick Development Fixes**: Use `scripts/manual-index-fix.js`
- **For Production Migrations**: Use the TypeORM migration setup
- **For Team Reference**: This guide documents both approaches

### **File Dependencies**
```
MongoDB Index Management
├── Manual Approach
│   └── scripts/manual-index-fix.js (standalone)
└── TypeORM Approach
    ├── migration.config.ts
    ├── src/migrations/1703876400000-UpdateExifKeysEntity.ts
    └── package.json (migration scripts)
```

---

## 📋 Table of Contents
- [Problem Overview](#problem-overview)
- [Approach Comparison](#approach-comparison)
- [Manual Index Management](#manual-index-management)
- [TypeORM Migration](#typeorm-migration)
- [Decision Matrix](#decision-matrix)
- [Recommendations](#recommendations)
- [Best Practices](#best-practices)
- [Implementation Examples](#implementation-examples)

## 🚨 Problem Overview

### Issue
MongoDB index conflicts occur when entity schema changes create conflicting index definitions. In our case:

```typescript
// OLD (causing conflict)
@Index({ unique: true })
name: string;

// NEW (current)
@Column({ unique: true })
name: string;
```

**Error**: `MongoServerError: Index with name: UQ_0cce5fdd452145e4482056d748f already exists with a different name`

### Root Cause
- Changed unique constraint definition from `@Index({ unique: true })` to `@Column({ unique: true })`
- Added new `typeConflicts` field for handling EXIF type conflicts
- Modified enum values for consistency (`'NOT_SUPPORTED'` → `'not_supported'`, `'string[]'` → `'string_array'`)

## 📊 Approach Comparison

### Manual Index Management

#### ✅ Advantages
- **Full Control** - Complete control over MongoDB operations
- **Performance** - Direct MongoDB commands are often faster
- **Flexibility** - Can handle complex MongoDB-specific operations
- **Immediate** - Changes apply instantly without migration infrastructure
- **MongoDB Native** - Uses native MongoDB features and aggregation pipelines

#### ❌ Disadvantages
- **No Version Control** - No automatic tracking of schema changes
- **Manual Coordination** - Team members must manually apply changes
- **Error Prone** - Easy to forget steps or apply in wrong order
- **No Rollback** - Difficult to undo changes automatically
- **Environment Sync** - Hard to keep dev/staging/prod in sync

### TypeORM Migration

#### ✅ Advantages
- **Version Control** - All schema changes are tracked in code
- **Team Coordination** - Everyone gets the same changes automatically
- **Rollback Support** - Built-in ability to undo migrations
- **Environment Consistency** - Same changes applied across all environments
- **Automatic Execution** - Can run migrations on app startup
- **Documentation** - Migration files serve as change documentation

#### ❌ Disadvantages
- **Limited MongoDB Support** - TypeORM migrations work better with SQL databases
- **Complex Setup** - Requires migration infrastructure
- **Learning Curve** - Team needs to understand migration concepts
- **Overhead** - Extra complexity for simple changes

## 🛠️ Manual Index Management

### When to Use
- 🚀 Rapid development/prototyping
- 🧪 Experimenting with schema changes
- 🏃‍♂️ Quick fixes needed
- 🎯 MongoDB-specific operations required

### Implementation

#### 1. Create Manual Script
```javascript
// scripts/manual-index-fix.js

// Step 1: Check current indexes
print('=== Current Indexes ===');
db.exif_keys.getIndexes().forEach(function (index) {
  printjson(index);
});

// Step 2: Drop the conflicting unique index
print('\n=== Dropping Conflicting Index ===');
try {
  db.exif_keys.dropIndex('UQ_0cce5fdd452145e4482056d748f');
  print('✅ Successfully dropped conflicting index');
} catch (e) {
  print('Index might not exist or already dropped: ' + e.message);
}

// Step 3: Create new unique index with proper name
print('\n=== Creating New Unique Index ===');
db.exif_keys.createIndex(
  { name: 1 },
  {
    unique: true,
    name: 'name_unique_idx',
  },
);
print('✅ Created new unique index on name field');

// Step 4: Add typeConflicts field to existing documents
print('\n=== Adding typeConflicts Field ===');
const updateResult = db.exif_keys.updateMany(
  { typeConflicts: { $exists: false } },
  { $set: { typeConflicts: null } },
);
print(
  `✅ Updated ${updateResult.modifiedCount} documents with typeConflicts field`,
);

// Step 5: Update enum values if needed
print('\n=== Updating Enum Values ===');
const enumUpdates = [
  { old: 'NOT_SUPPORTED', new: 'not_supported' },
  { old: 'string[]', new: 'string_array' },
];

enumUpdates.forEach(function (update) {
  const result = db.exif_keys.updateMany(
    { type: update.old },
    { $set: { type: update.new } },
  );
  if (result.modifiedCount > 0) {
    print(
      `✅ Updated ${result.modifiedCount} documents: ${update.old} → ${update.new}`,
    );
  }
});

// Step 6: Verify final state
print('\n=== Final Verification ===');
print('Indexes after changes:');
db.exif_keys.getIndexes().forEach(function (index) {
  printjson(index);
});

print(`\nTotal documents: ${db.exif_keys.countDocuments()}`);
print('Sample document with new structure:');
printjson(db.exif_keys.findOne());

print('\n🎉 Manual index management completed!');
```

#### 2. Execute Script
```bash
# Run the script
docker exec IDB_2.0_mongodb_test mongo < scripts/manual-index-fix.js

# Or directly in MongoDB shell
mongo --eval "load('scripts/manual-index-fix.js')"
```

## 🔄 TypeORM Migration

### When to Use
- 👥 Multiple developers on team
- 🏭 Production environment with critical data
- 📝 Regulatory compliance requirements
- 🔄 Need rollback capabilities

### Setup

#### 1. Migration Configuration
```typescript
// migration.config.ts
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

const configService = new ConfigService();

export const migrationDataSource = new DataSource({
  type: 'mongodb',
  host: configService.get('MONGODB_HOST', 'localhost'),
  port: configService.get('MONGODB_PORT', 27017),
  database: configService.get('MONGODB_DATABASE', 'idb_test'),
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'migrations_history',
  logging: true,
  synchronize: false, // Always false for production
  useUnifiedTopology: true,
});

export default migrationDataSource;
```

#### 2. Package.json Scripts
```json
{
  "scripts": {
    "migration:generate": "typeorm-ts-node-commonjs migration:generate -d migration.config.ts",
    "migration:create": "typeorm-ts-node-commonjs migration:create",
    "migration:run": "typeorm-ts-node-commonjs migration:run -d migration.config.ts",
    "migration:revert": "typeorm-ts-node-commonjs migration:revert -d migration.config.ts",
    "migration:show": "typeorm-ts-node-commonjs migration:show -d migration.config.ts"
  }
}
```

#### 3. Migration File
```typescript
// src/migrations/1703876400000-UpdateExifKeysEntity.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateExifKeysEntity1703876400000 implements MigrationInterface {
  name = 'UpdateExifKeysEntity1703876400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop conflicting index
    try {
      await queryRunner.query(`
        db.exif_keys.dropIndex("UQ_0cce5fdd452145e4482056d748f")
      `);
      console.log('✅ Dropped conflicting unique index');
    } catch (error) {
      console.log('Index might not exist:', error.message);
    }

    // Create new unique index
    await queryRunner.query(`
      db.exif_keys.createIndex(
        { "name": 1 }, 
        { unique: true, name: "name_unique_idx" }
      )
    `);

    // Add typeConflicts field
    await queryRunner.query(`
      db.exif_keys.updateMany(
        { typeConflicts: { $exists: false } },
        { $set: { typeConflicts: null } }
      )
    `);

    // Update enum values
    const enumUpdates = [
      { old: 'NOT_SUPPORTED', new: 'not_supported' },
      { old: 'string[]', new: 'string_array' },
    ];

    for (const update of enumUpdates) {
      await queryRunner.query(`
        db.exif_keys.updateMany(
          { type: "${update.old}" },
          { $set: { type: "${update.new}" } }
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback operations
    
    // Revert enum values
    const enumReverts = [
      { old: 'not_supported', new: 'NOT_SUPPORTED' },
      { old: 'string_array', new: 'string[]' },
    ];

    for (const revert of enumReverts) {
      await queryRunner.query(`
        db.exif_keys.updateMany(
          { type: "${revert.old}" },
          { $set: { type: "${revert.new}" } }
        )
      `);
    }

    // Remove typeConflicts field
    await queryRunner.query(`
      db.exif_keys.updateMany(
        {},
        { $unset: { typeConflicts: "" } }
      )
    `);

    // Recreate old index
    await queryRunner.query(`
      db.exif_keys.dropIndex("name_unique_idx")
    `);

    await queryRunner.query(`
      db.exif_keys.createIndex(
        { "name": 1 }, 
        { unique: true, name: "UQ_0cce5fdd452145e4482056d748f" }
      )
    `);
  }
}
```

#### 4. Running Migrations
```bash
# Generate migration
npm run migration:generate src/migrations/UpdateExifKeys

# Run migrations
npm run migration:run

# Rollback migration
npm run migration:revert

# Show migration status
npm run migration:show
```

## 🎯 Decision Matrix

| Factor | Manual Management | TypeORM Migration | Winner |
|--------|------------------|-------------------|---------|
| **Setup Speed** | ⚡ Instant | 🐌 Complex | Manual |
| **Team Coordination** | ❌ Manual | ✅ Automatic | TypeORM |
| **Version Control** | ❌ None | ✅ Full | TypeORM |
| **Rollback Support** | ❌ Manual | ✅ Built-in | TypeORM |
| **MongoDB Features** | ✅ Full Support | ⚠️ Limited | Manual |
| **Learning Curve** | ✅ Simple | ❌ Complex | Manual |
| **Production Safety** | ⚠️ Risky | ✅ Safe | TypeORM |
| **Flexibility** | ✅ Full Control | ⚠️ Limited | Manual |

## 📋 Recommendations

### For IDB Back 2.0 Project

**Current Phase: Use Manual Index Management**

**Reasons:**
1. **MongoDB Usage Pattern**: Already using direct MongoDB operations for performance-critical aggregations
2. **Development Phase**: Actively refactoring (exif-keys module) and making significant changes
3. **Team Structure**: Senior Frontend/Junior++ Backend developer - manual approach is more straightforward
4. **NestJS + MongoDB**: TypeORM migrations have limited MongoDB support

### Future Migration Strategy

#### Phase 1 (Current): Manual Management
- ✅ Use for rapid development and experimentation
- ✅ Perfect for current refactoring work
- ✅ Keep manual scripts for future use

#### Phase 2 (Team Growth): Hybrid Approach
- 🔄 Introduce migrations for critical production changes
- 🔄 Keep manual approach for development experiments
- 🔄 Document all changes in migration files

#### Phase 3 (Mature Product): Full Migration System
- 🎯 All schema changes through migrations
- 🎯 Automated deployment with migration runs
- 🎯 Full rollback capabilities

## 🛠️ Best Practices

### Manual Index Management
1. **Document Changes**: Keep a changelog of manual schema changes
2. **Test Scripts**: Always test manual scripts on development data first
3. **Backup Strategy**: Always backup before manual changes in production
4. **Team Communication**: Share manual scripts with team members
5. **Version Scripts**: Store scripts in git for reproducibility

### TypeORM Migrations
1. **Never Skip Migrations**: Always run migrations in sequence
2. **Test Rollbacks**: Ensure down() methods work correctly
3. **Backup Before Migration**: Always backup production data
4. **Review Generated Migrations**: Auto-generated migrations may need manual adjustments
5. **Environment Parity**: Test migrations on staging before production

## 🚀 Implementation Examples

### Quick Fix Solutions

#### Option 1: Drop Database (Development Only)
```bash
# Drop entire database - ONLY for development
docker exec IDB_2.0_mongodb_test mongo --eval "db.dropDatabase()"

# Restart application
npm run start:dev
```

#### Option 2: Manual Script (Production Safe)
```bash
# Run manual index management script
docker exec IDB_2.0_mongodb_test mongo < scripts/manual-index-fix.js
```

#### Option 3: TypeORM Migration
```bash
# Create and run migration
npm run migration:create src/migrations/FixExifKeysIndex
npm run migration:run
```

### Emergency Rollback Procedures

#### Manual Rollback
```javascript
// Rollback script
db.exif_keys.dropIndex("name_unique_idx");
db.exif_keys.createIndex(
  { "name": 1 }, 
  { unique: true, name: "UQ_0cce5fdd452145e4482056d748f" }
);
db.exif_keys.updateMany({}, { $unset: { typeConflicts: "" } });
```

#### TypeORM Rollback
```bash
npm run migration:revert
```

## 🔍 Troubleshooting

### Common Issues

1. **Index Already Exists**
   ```bash
   # Check existing indexes
   db.exif_keys.getIndexes()
   # Drop specific index
   db.exif_keys.dropIndex("index_name")
   ```

2. **Migration Stuck**
   ```bash
   # Check migration status
   npm run migration:show
   # Force revert if needed
   npm run migration:revert
   ```

3. **Schema Mismatch**
   ```bash
   # Verify entity matches database
   db.exif_keys.findOne()
   ```

## 📝 Conclusion

For the IDB Back 2.0 project, **Manual Index Management** is the recommended approach due to:
- Active development phase with frequent schema changes
- MongoDB-centric operations already in use
- Single developer primary responsibility
- Need for flexibility during refactoring

The TypeORM Migration approach should be considered for future phases when:
- Multiple developers join the team
- Production deployment with critical data
- Regulatory compliance requirements emerge
- Rollback capabilities become essential

Both approaches have their place in the development lifecycle, and the choice should align with project phase, team structure, and operational requirements. 