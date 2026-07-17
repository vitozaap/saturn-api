import { Injectable } from "@nestjs/common"
import {
    PutObjectCommand,
    S3Client,
    HeadObjectCommand,
    GetObjectCommand,
    DeleteObjectsCommand,
    ObjectIdentifier,
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

    // Batch-deletes the objects behind the given rows and returns the ids whose
    // object was actually removed, so the caller only marks those rows EXPIRED.
    // Rows whose key is reported in payload.Errors are left out (retried next sweep).
    async DeleteMany(stales: Stale[]): Promise<string[]> {
        if (stales.length === 0) return []
        try {
            // Use the outputKey when present (finished compression); otherwise the
            // sourceKey, since an unfinished compression has no output object yet.
            const items = stales.map((row) => ({ id: row.id, Key: row.outputKey ?? row.sourceKey }))
            const command = new DeleteObjectsCommand({
                Bucket: this.bucket,
                Delete: {
                    Objects: items.map(({ Key }): ObjectIdentifier => ({ Key })),
                },
            })
            const payload = await this.send(command)
            const failedKeys = new Set((payload.Errors ?? []).map((err) => err.Key))
            if (failedKeys.size >= 1) {
                Sentry.captureMessage(`Failed to delete some objects`, {
                    level: "warning", extra: {
                        failedObjects: payload.Errors,
                        totalAttempted: items.length
                    }
                })
            }
            return items.filter(({ Key }) => !failedKeys.has(Key)).map(({ id }) => id)
        }
        catch (err) {
            Sentry.captureException(err)
            throw err
        }
    }
}
