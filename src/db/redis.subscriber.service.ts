import { Injectable, OnModuleDestroy } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import Redis from "ioredis"
import { Observable, Subject } from "rxjs"
import { Env } from "../config/env"

@Injectable()
export class RedisSubscriberService implements OnModuleDestroy {
    private readonly client: Redis
    // One Subject per Redis channel, refcounted so we SUBSCRIBE on the first
    // listener and UNSUBSCRIBE when the last one leaves.
    private readonly channels = new Map<string, { subject: Subject<string>; refs: number }>()

    constructor(config: ConfigService<Env>) {
        this.client = new Redis(config.getOrThrow("REDIS_URL"), {
            // Keep the process alive through Redis outages — the SSE safety poll
            // covers correctness while the connection retries in the background.
            maxRetriesPerRequest: null,
        })
        // Without a handler ioredis throws on transient connection errors.
        this.client.on("error", () => {})
        this.client.on("message", (channel, message) => {
            this.channels.get(channel)?.subject.next(message)
        })
    }

    // Hot stream of messages published to `channel`.
    channel(channel: string): Observable<string> {
        return new Observable<string>((subscriber) => {
            let entry = this.channels.get(channel)
            if (!entry) {
                entry = { subject: new Subject<string>(), refs: 0 }
                this.channels.set(channel, entry)
                this.client.subscribe(channel)
            }
            entry.refs++
            const inner = entry.subject.subscribe(subscriber)
            return () => {
                inner.unsubscribe()
                if (--entry.refs === 0) {
                    this.client.unsubscribe(channel)
                    this.channels.delete(channel)
                }
            }
        })
    }

    onModuleDestroy() {
        this.client.disconnect()
    }
}
