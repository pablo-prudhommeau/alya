import {NestFactory} from '@nestjs/core';
import * as log4js from 'log4js';
import {AppModule} from './app/app.module';

declare const module: any;

async function bootstrap() {
    const logger = log4js.getLogger();
    logger.level = 'trace';
    log4js.configure({
        appenders: {
            default: {
                type: 'file',
                filename: './logs/default.log'
            },
            console: {
                type: 'console'
            }
        },
        categories: {
            default: {
                appenders: ['default', 'console'], level: 'trace'
            }
        }
    });

    const app = await NestFactory.create(AppModule);
    app.setGlobalPrefix('app');
    await app.listen(3000);

    if (module.hot) {
        module.hot.accept();
        module.hot.dispose(() => app.close());
    }
}

bootstrap();
