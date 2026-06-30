import { Injectable } from "@nestjs/common";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { fromIni } from "@aws-sdk/credential-providers"
import { ConfigService } from "@nestjs/config";
import { env, Env } from "../../config/env";
import { GetUploadUrlParams } from "./types";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
@Injectable()
export class S3Service extends S3Client {
    private readonly bucket: string;
    constructor(private readonly configService: ConfigService<Env>) {
        super({
            // Reads credentials from Ini if on dev environment
            credentials: configService.getOrThrow("NODE_ENV") == "production" ? undefined : fromIni({ profile: "saturn" }),
            region: "sa-east-1"
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


    // TODO: getDownloadUrl
}