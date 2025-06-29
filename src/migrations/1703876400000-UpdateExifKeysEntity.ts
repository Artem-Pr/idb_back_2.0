import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateExifKeysEntity1703876400000 implements MigrationInterface {
  name = 'UpdateExifKeysEntity1703876400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Note: TypeORM migrations for MongoDB are limited
    // Most operations need to be done via raw MongoDB queries

    // 1. Drop conflicting index
    try {
      await queryRunner.query(`
        db.exif_keys.dropIndex("UQ_0cce5fdd452145e4482056d748f")
      `);
      console.log('✅ Dropped conflicting unique index');
    } catch (error) {
      console.log('Index might not exist:', error.message);
    }

    // 2. Create new unique index
    await queryRunner.query(`
      db.exif_keys.createIndex(
        { "name": 1 }, 
        { unique: true, name: "name_unique_idx" }
      )
    `);
    console.log('✅ Created new unique index');

    // 3. Add typeConflicts field to existing documents
    await queryRunner.query(`
      db.exif_keys.updateMany(
        { typeConflicts: { $exists: false } },
        { $set: { typeConflicts: null } }
      )
    `);
    console.log('✅ Added typeConflicts field');

    // 4. Update enum values
    const enumUpdates = [
      { old: 'NOT_SUPPORTED', new: 'not_supported' },
      { old: 'string[]', new: 'string_array' },
    ];

    for (const update of enumUpdates) {
      const result = await queryRunner.query(`
        db.exif_keys.updateMany(
          { type: "${update.old}" },
          { $set: { type: "${update.new}" } }
        )
      `);
      if (result.modifiedCount > 0) {
        console.log(`✅ Updated enum: ${update.old} → ${update.new}`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback operations

    // 1. Revert enum values
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

    // 2. Remove typeConflicts field
    await queryRunner.query(`
      db.exif_keys.updateMany(
        {},
        { $unset: { typeConflicts: "" } }
      )
    `);

    // 3. Drop new index and recreate old one
    await queryRunner.query(`
      db.exif_keys.dropIndex("name_unique_idx")
    `);

    await queryRunner.query(`
      db.exif_keys.createIndex(
        { "name": 1 }, 
        { unique: true, name: "UQ_0cce5fdd452145e4482056d748f" }
      )
    `);

    console.log('✅ Migration rolled back');
  }
}
