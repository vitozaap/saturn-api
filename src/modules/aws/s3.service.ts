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
    private readonly downloadTtl: number
    private readonly uploadTtl: number
    // Client used only to sign presigned URLs. They go to the browser, which
    // can't resolve the compose service name the server talks to (minio:9000),
    // so in dev they are signed against a host-reachable endpoint
    // (S3_PUBLIC_ENDPOINT, e.g. localhost:9000). In prod both share the one
    // public endpoint, so it reuses the base client.
    private readonly presignClient: S3Client
    constructor(private readonly configService: ConfigService<Env>) {
        const credentials = {
            accessKeyId: configService.getOrThrow("MINIO_USER"),
            secretAccessKey: configService.getOrThrow("MINIO_PASSWORD"),
        }
        super({
            // Using minIO as default bucket
            credentials,
            endpoint: configService.getOrThrow("S3_ENDPOINT"),
            forcePathStyle: true,
            region: "sa-east-1",
            // Don't bake an x-amz-checksum-crc32 placeholder into presigned URLs
            // (prod presigns with this base client): the browser PUT can't
            // recompute it, so MinIO rejects the mismatch with 403.
            requestChecksumCalculation: "WHEN_REQUIRED",
        })
        this.bucket = this.configService.getOrThrow("BUCKET")
        this.downloadTtl = this.configService.getOrThrow("PRESIGN_DOWNLOAD_TTL")
        this.uploadTtl = this.configService.getOrThrow("PRESIGN_UPLOAD_TTL")
        this.presignClient =
            this.configService.getOrThrow("NODE_ENV") === "production"
                ? this
                : new S3Client({
                    credentials,
                    endpoint: this.configService.getOrThrow("S3_PUBLIC_ENDPOINT"),
                    forcePathStyle: true,
                    region: "sa-east-1",
                    requestChecksumCalculation: "WHEN_REQUIRED",
                })
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
        return await getSignedUrl(this.presignClient, command, {
            signableHeaders: new Set(["content-type"]),
            expiresIn: this.uploadTtl,
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

    async getDownloadUrl(key: string, filename: string) {
        try {
            const command = new GetObjectCommand({
                Bucket: this.bucket,
                Key: key,
                // Without this the object is served as video/mp4 and the browser
                // plays it inline instead of downloading. The `download` attribute
                // on an <a> cannot fix it either: it is ignored cross-origin.
                // RFC 5987 encoding, since filenames are often accented (pt-BR).
                ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
            })
            return await getSignedUrl(this.presignClient, command, {
                expiresIn: this.downloadTtl,
            })
        }
        catch (err) {
            Sentry.captureMessage(`Failed to generate presigned url: ${err}`)
            throw err
        }
    }

    async deleteMany(stales: Stale[]): Promise<string[]> {
        if (stales.length === 0) return []
        // Use the outputKey when present, otherwise use the
        // sourceKey, since an unfinished compression has no output.
        const items = stales.map((row) => ({ id: row.id, Key: row.outputKey ?? row.sourceKey }))
        const failedKeys = await this.sendDelete(items.map(({ Key }) => Key))
        // First will get only the s3 objects that were delete !failedKeys.has(Key). 
        // After will map to get only the IDs so the cleanup can use them to update statuses .map(({id}) => id)
        return items.filter(({ Key }) => !failedKeys.has(Key)).map(({ id }) => id)
    }


    async deleteKeys(keys: string[]): Promise<void> {
        const failedKeys = await this.sendDelete(keys)
        if (failedKeys.size >= 1) {
            throw new Error(`Failed to delete ${failedKeys.size} object(s) from S3`)
        }
    }

    // Returns the subset of keys S3 refused to delete.
    private async sendDelete(keys: string[]): Promise<Set<string | undefined>> {
        if (keys.length === 0) return new Set()
        try {
            const command = new DeleteObjectsCommand({
                Bucket: this.bucket,
                Delete: {
                    Objects: keys.map((Key): ObjectIdentifier => ({ Key })),
                },
            })
            const payload = await this.send(command)
            // Creates a new Set with only the failed keys. Running through payload.Errors and mapping to get only the keys
            const failedKeys = new Set((payload.Errors ?? []).map((err) => err.Key))
            if (failedKeys.size >= 1) {
                Sentry.captureMessage(`Failed to delete some objects`, {
                    level: "warning", extra: {
                        failedObjects: payload.Errors,
                        totalAttempted: keys.length
                    }
                })
            }
            return failedKeys
        }
        catch (err) {
            Sentry.captureException(err)
            throw err
        }
    }
}
