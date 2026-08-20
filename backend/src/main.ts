import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // An allowlist when CORS_ORIGINS is set, today's allow-all when it is not.
  //
  // The fallback keeps every local workflow working unchanged — the Expo dev
  // server, a LAN device, the e2e suite's own web origin — none of which share
  // a fixed origin. A deployed environment always sets the variable, so
  // allow-all never reaches one. Requests with no Origin header (curl, health
  // checks, server-to-server) are allowed either way; CORS is a browser
  // mechanism and rejecting them would only break the health check.
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow: boolean) => void,
    ) => {
      if (corsOrigins.length === 0 || !origin) return callback(null, true);
      return callback(null, corsOrigins.includes(origin));
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  const port = process.env.PORT ?? 3000;

  const config = new DocumentBuilder()
    .setTitle('CrossFit Box API')
    .setDescription('Gym Owner & Athlete Management API')
    .setVersion('1.0')
    .addServer(process.env.PUBLIC_API_URL ?? `http://localhost:${port}`)
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(port);
}

bootstrap().catch((err) => {
  console.error('Failed to bootstrap app:', err);
  process.exit(1);
});
