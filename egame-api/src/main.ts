import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 啟用 Shutdown hook 以確保能正確觸發 onModuleDestroy 來關閉 Python process
  app.enableShutdownHooks();

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
