import { NextFunction, Request, Response } from "express";
import * as mongo from 'mongodb';
declare global {
    namespace Express {
        interface Request {
            logger: Logger;
        }
        interface Response {
            logger: Logger;
        }
    }
}
export declare type Level = 'error' | 'warn' | 'log' | 'time' | 'info' | 'debug' | 'ERROR' | 'WARN' | 'LOG' | 'TIME' | 'INFO' | 'DEBUG' | 1 | 2 | 3 | 4 | 5 | 6 | 'all';
export declare const LOG_LEVELS: {
    error: number;
    warn: number;
    log: number;
    time: number;
    info: number;
    debug: number;
    ERROR: number;
    WARN: number;
    LOG: number;
    TIME: number;
    INFO: number;
    DEBUG: number;
    6: number;
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
    all: number;
};
export declare type LoggerConfig = {
    level: Level;
    file: {
        enable: boolean;
        level: Level;
        options: {
            path?: string;
            startPWD?: boolean;
        };
    };
    console: {
        enable: boolean;
        level: Level;
    };
    mongodb: {
        enable?: boolean;
        level: Level;
        uri: string;
    };
};
declare class TimeTracker {
    start: number;
    end: number;
    constructor();
    stop(): number | undefined;
    get runtime(): number | undefined;
    get startTime(): string;
    get endTime(): string;
    getTime(ms: number): string;
}
declare class Logger {
    static inc: number;
    id: number;
    stack: any[];
    logger: LoggerService;
    req: Request;
    res: Response;
    timing: TimeTracker;
    logs: never[];
    constructor(req: Request, res: Response, logger: LoggerService);
    error(...message: any): void;
    warn(...message: any): void;
    log(...message: any): void;
    info(...message: any): void;
    debug(...message: any): void;
    isEnable(transport: "console" | "file" | "mongodb" | undefined, level: Level): boolean;
    writeCombinedLogs(): void;
    init(): void;
    end(): void;
    get requestData(): string;
    get responseData(): string;
    get styledRequestData(): string;
    get styledResponseData(): string;
    get styledExecutedTime(): string;
    get styledResponseStatus(): string;
    get styledMethod(): string;
    style(style: any, text: string): string;
}
export declare class LoggerService {
    config: LoggerConfig;
    fileTransports: any;
    mongo: mongo.MongoClient;
    constructor(config: LoggerConfig);
    initFileStorage(config: any): void;
    initMongoStorage(uri: string): void;
    middleware: (req: Request, res: Response, next: NextFunction) => void;
}
export default LoggerService;
