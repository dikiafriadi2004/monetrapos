import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('Starting standalone seeder...');
  const app = await NestFactory.createApplicationContext(AppModule);
  console.log('App context initialized. Seeder should have run via onModuleInit().');
  await app.close();
  console.log('Seeder finished successfully.');
}

bootstrap().catch(err => {
  console.error('Seeder failed:', err);
  process.exit(1);
});
