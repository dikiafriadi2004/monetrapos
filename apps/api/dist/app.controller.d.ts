import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getWelcome(): {
        name: string;
        version: string;
        status: string;
        message: string;
        documentation: string;
        endpoints: {
            health: string;
            healthSimple: string;
            swagger: string;
        };
        timestamp: string;
    };
}
