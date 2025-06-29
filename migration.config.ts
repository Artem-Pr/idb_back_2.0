import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

// Configuration for running migrations
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
