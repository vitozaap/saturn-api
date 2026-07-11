import { Global, Module } from "@nestjs/common"
import { RedisSubscriberService } from "./redis.subscriber.service"

@Global()
@Module({
    providers: [RedisSubscriberService],
    exports: [RedisSubscriberService],
})
export class RedisModule {}
