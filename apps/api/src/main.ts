import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  // rawBody: true exposes req.rawBody alongside the normal parsed req.body,
  // needed for the Razorpay webhook route to verify the payload signature.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();
