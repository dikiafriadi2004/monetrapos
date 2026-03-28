export declare class AppService {
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
