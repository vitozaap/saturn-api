import { Injectable } from "@nestjs/common"
import {
    PutObjectCommand,
    S3Client,
    HeadObjectCommand,
    GetObjectCommand,
    DeleteObjectsCommand,
    ObjectIdentifier,
    ObjectIdentifier$,
} from "@aws-sdk/client-s3"
import { ConfigService } from "@nestjs/config"
import { Env } from "../../config/env"
import * as Sentry from "@sentry/nestjs"
import { GetUploadUrlParams, Stale } from "./types"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
@Injectable()
export class S3Service extends S3Client {
    private readonly bucket: string
    constructor(private readonly configService: ConfigService<Env>) {
        super({
            // Using minIO as default bucket
            credentials: {
                accessKeyId: configService.getOrThrow("MINIO_USER"),
                secretAccessKey: configService.getOrThrow("MINIO_PASSWORD"),
            },
            endpoint: configService.getOrThrow("S3_ENDPOINT"),
            forcePathStyle: true,
            region: "sa-east-1",
        })
        this.bucket = this.configService.getOrThrow("BUCKET")
    }

    safeName(filename: string) {
        return filename.replace(/[/\\]/g, "_")
    }

    generateSourceKey(userId: string, filename: string) {
        const uploadPath = this.configService.getOrThrow("UPLOADS_PATH")
        // Builds a key: "uploads/userId/uuid/safe_filename"
        return `${uploadPath}/${userId}/${crypto.randomUUID()}/${this.safeName(filename)}`
    }

    async getUploadUrl(params: GetUploadUrlParams) {
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: params.key,
            ContentType: params.contentType,
        })
        // Force content-type into the signature so S3 rejects the upload
        // when the PUT's Content-Type differs from the one signed here.
        return await getSignedUrl(this, command, {
            signableHeaders: new Set(["content-type"]),
        })
    }

    // Returns the stored object's size in bytes, or null when the key does not
    // exist yet (user never completed the presigned PUT). BigInt because videos
    // can exceed Int / ~2GB.
    async getObjectSourceSize(key: string): Promise<bigint | null> {
        try {
            const res = await this.send(
                new HeadObjectCommand({
                    Bucket: this.bucket,
                    Key: key,
                }),
            )
            return res.ContentLength != null ? BigInt(res.ContentLength) : null
        } catch (err) {
            if (err instanceof Error && (err.name === "NotFound" || err.name === "NoSuchKey")) return null
            throw err
        }
    }

    async getDownloadUrl(key: string) {
        try {
            const command = new GetObjectCommand({
                Bucket: this.bucket,
                Key: key
            })
            return await getSignedUrl(this, command, {
                expiresIn: 3000,
            })
        }
        catch (err) {
            Sentry.captureMessage(`Failed to generate presigned url: ${err}`)
            throw err
        }
    }

    async DeleteMany(stales: Stale[]) {
        try {
            // Will map to "Key" the sourceKey only if the output is null.
            // Because it means the compression didnt finish
            const mapped: ObjectIdentifier[] = stales.map((row) => ({ Key: row.outputKey ?? row.sourceKey }))
            const command = new DeleteObjectsCommand({
                Bucket: this.bucket,
                Delete: {
                    Objects: mapped
                }
            })
            const payload = await this.send(command)
            if (payload.Errors && payload.Errors.length >= 1) {
                Sentry.captureMessage(`Failed to delete some objects`, {
                    level: "warning", extra: {
                        failedObjects: payload.Errors,
                        totalAttempted: mapped.length
                    }
                })
            }
        }
        catch (err) {
            if (err instanceof Error && (err.name == "NotFound" || err.name == "NoSuchKey")) {
                Sentry.captureMessage(`Failed to complete "delete many" operation: ${err.name}`)
                return null
            }
            Sentry.captureException(err)
            throw err
        }
    }
}
