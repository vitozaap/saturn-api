import "reflect-metadata"
import "dotenv/config"

import { NestFactory } from "@nestjs/core"

import { AppModule } from "./app.module"
import { Logger, ValidationPipe } from "@nestjs/common"
import { env } from "./config/env"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import { apiReference } from "@scalar/nestjs-api-reference"
async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        bodyParser: false,
    })
    const logger = new Logger(AppModule.name)
    const rawPort = (process.env.PORT ?? "").trim()
    app.useGlobalPipes(new ValidationPipe())
    app.enableCors({
        origin: env.WEB_URL,
        credentials: true,
    })
    const parsedPort = rawPort.length > 0 ? Number(rawPort) : Number.NaN
    const port = Number.isFinite(parsedPort) && parsedPort >= 0 && parsedPort <= 65535 ? parsedPort : 3000
    const config = new DocumentBuilder()
        .setTitle("Saturn")
        .setDescription("Saturn Project API Docs")
        .setVersion("0.1")
        .build()
    const document = SwaggerModule.createDocument(app, config)
    app.use(
        "/reference",
        apiReference({
            pageTitle: "Saturn API",
            sources: [
                {
                    default: true,
                    content: document,
                },
                {
                    url: "/api/auth/open-api/generate-schema",
                },
            ],
        }),
    )
    await app.listen(port, "0.0.0.0")
    logger.log(`Server running at http://localhost:${port}`)
}

bootstrap().catch((error) => {
    console.error("Failed to start server", error)
    process.exit(1)
})
