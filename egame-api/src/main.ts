import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 啟用 Shutdown hook 以確保能正確觸發 onModuleDestroy 來關閉 Python process
  app.enableShutdownHooks();

  // Increase body size limit
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Swagger Setup
  const config = new DocumentBuilder()
    .setTitle('eGame API')
    .setDescription('The unofficial eGame Room API')
    .setVersion('1.0')
    .addTag('Rooms')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
