import { Compression } from "../../db/generated/prisma/client"

type GetUploadUrlParams = {
    key: string
    contentType: string
}

export type {
    GetUploadUrlParams
}

export interface Stale extends Pick<Compression, "sourceKey" | "outputKey" | "id"> { }