import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('RACE Protocol API')
    .setDescription('Backend API for RACE Protocol - RWA-Powered Autonomous Commerce Engine')
    .setVersion('1.0')
    .addTag('agents', 'AI Agent operations')
    .addTag('contracts', 'Smart contract interactions')
    .addTag('analytics', 'Analytics and reporting')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3002;
  await app.listen(port);

  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║   🚀  RACE Protocol Backend API                                     ║
║                                                                      ║
║   Server running on: http://localhost:${port}                          ║
║   API Documentation: http://localhost:${port}/api                      ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
