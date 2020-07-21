"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerService = exports.LOG_LEVELS = void 0;
const mongo = __importStar(require("mongodb"));
const styles = require('ansi-styles');
const fs = require('fs');
const path = require('path');
const util = require('util');
const logsFormat = require('./lib/formater');
exports.LOG_LEVELS = {
    'error': 6,
    'warn': 5,
    'log': 4,
    'time': 3,
    'info': 2,
    'debug': 1,
    'ERROR': 6,
    'WARN': 5,
    'LOG': 4,
    'TIME': 3,
    'INFO': 2,
    'DEBUG': 1,
    6: 6,
    5: 5,
    4: 4,
    3: 3,
    2: 2,
    1: 1,
    'all': 0
};
class TimeTracker {
    constructor() {
        this.start = Date.now();
    }
    stop() {
        this.end = Date.now();
        return this.runtime;
    }
    get runtime() {
        if (!this.end) {
            return;
        }
        return this.end - this.start;
    }
    get startTime() {
        return this.getTime(this.start);
    }
    get endTime() {
        return this.getTime(this.end || this.start);
    }
    getTime(ms) {
        const date = new Date(ms);
        return date.getHours() + ':' + date.getMinutes();
    }
}
class Logger {
    constructor(req, res, logger) {
        this.stack = [];
        this.logs = [];
        this.id = ++Logger.inc;
        this.timing = new TimeTracker();
        this.logger = logger;
        this.req = req;
        this.res = res;
        const endFunc = res.end;
        res.end = (...params) => {
            // @ts-ignore
            endFunc.call(res, ...params);
            this.end();
        };
        this.init();
    }
    error(...message) {
        if (this.isEnable('file', 'error')) {
            this.logger.fileTransports.online.write(logsFormat.format(this.requestData, message));
        }
        if (this.isEnable('file', 'error')) {
            this.logger.fileTransports.error.write(logsFormat.format(this.requestData, message));
        }
        this.stack.push({
            time: Date.now(),
            level: 'ERROR',
            message
        });
    }
    warn(...message) {
        if (this.isEnable('file', 'warn')) {
            this.logger.fileTransports.online.write(logsFormat.format(this.requestData, message));
        }
        this.stack.push({
            time: Date.now(),
            level: 'WARN',
            message
        });
    }
    log(...message) {
        if (this.isEnable('file', 'log')) {
            this.logger.fileTransports.online.write(logsFormat.format(this.requestData, message));
        }
        this.stack.push({
            time: Date.now(),
            level: 'LOG',
            message
        });
    }
    info(...message) {
        if (this.isEnable('file', 'info')) {
            this.logger.fileTransports.online.write(logsFormat.format(this.requestData, message));
        }
        this.stack.push({
            time: Date.now(),
            level: 'INFO',
            message
        });
    }
    debug(...message) {
        if (this.isEnable('file', 'debug')) {
            this.logger.fileTransports.online.write(logsFormat.format(this.requestData, message));
        }
        this.stack.push({
            time: Date.now(),
            level: 'DEBUG',
            message
        });
    }
    isEnable(transport = 'file', level) {
        const config = this.logger.config[transport];
        if (!config || config.enable) {
            return false;
        }
        const minLogLevel = exports.LOG_LEVELS[config.level];
        const currentLogLevel = exports.LOG_LEVELS[level];
        return currentLogLevel >= minLogLevel;
    }
    writeCombinedLogs() {
        var _a;
        if ((_a = this.logger.config) === null || _a === void 0 ? void 0 : _a.file) {
            let result = '';
            result += this.requestData + '\n';
            for (let log of this.stack) {
                if (this.isEnable('file', log.level)) {
                    result += '  ' + `${log.level} > ${log.time} | `;
                    result += logsFormat.parseObj(log.message, 2);
                }
            }
            result += this.responseData + '\n';
            this.logger.fileTransports.combined.write(result);
        }
    }
    init() {
        if (this.isEnable('console', 'log')) {
            console.log(this.styledRequestData);
        }
    }
    end() {
        this.timing.stop();
        if (this.isEnable('console', 'log')) {
            console.log(this.styledResponseData);
        }
        this.writeCombinedLogs();
    }
    get requestData() {
        return `${this.id} | ${this.timing.startTime} | > ${this.req.method}` +
            ` > ${(this.req.ip || '')}` +
            ` > ${this.req.originalUrl}`;
    }
    get responseData() {
        return `${this.id} | ${this.timing.endTime} | < ${this.res.statusCode} < ${this.timing.runtime || '0'}`;
    }
    get styledRequestData() {
        return `${this.id} | ${this.timing.startTime} | > ${this.styledMethod}` +
            ` > ${(this.req.ip || '')}` +
            ` > ${this.req.originalUrl}`;
    }
    get styledResponseData() {
        return `${this.id} | ${this.timing.endTime} | < ${this.styledResponseStatus} < ${this.styledExecutedTime}`;
    }
    get styledExecutedTime() {
        const ms = this.timing.runtime;
        if (!ms && ms !== 0) {
            return this.style(styles.color.red, '---');
        }
        if (ms < 60) {
            return this.style(styles.color.green, (ms || '0') + 'ms');
        }
        else if (ms < 120) {
            return this.style(styles.color.gray, ms + 'ms');
        }
        if (ms < 200) {
            return this.style(styles.color.yellow, ms + 'ms');
        }
        else {
            return this.style(styles.color.red, ms + 'ms');
        }
    }
    get styledResponseStatus() {
        const status = +this.res.statusCode;
        if (!status) {
            return this.style(styles.color.red, this.style(styles.bgGray, '----'));
        }
        let style;
        if (status < 300) {
            style = styles.color.green;
        }
        else if (status < 400) {
            style = styles.color.gray;
        }
        else if (status < 500) {
            style = styles.color.yellow;
        }
        else {
            style = styles.color.red;
        }
        return this.style(style, status.toString());
    }
    get styledMethod() {
        // @ts-ignore
        const style = {
            'GET': styles.color.green,
            'POST': styles.color.yellow,
            'PUT': styles.color.yellow,
            'DELETE': styles.color.red,
            'OPTIONS': styles.color.grey
        }[this.req.method.toUpperCase()] || styles.bgRedBright;
        return this.style(style, this.req.method.toUpperCase());
    }
    style(style, text) {
        return `${style.open}${text}${style.close}`;
    }
}
Logger.inc = 0;
class LoggerService {
    constructor(config) {
        var _a, _b;
        this.middleware = (req, res, next) => {
            req.logger = new Logger(req, res, this);
            res.logger = req.logger;
            next();
        };
        this.config = config;
        if ((_a = this.config.file) === null || _a === void 0 ? void 0 : _a.enable) {
            this.initFileStorage(this.config.file.options);
        }
        if ((_b = this.config.mongodb) === null || _b === void 0 ? void 0 : _b.enable) {
            this.initMongoStorage(this.config.mongodb.uri);
        }
    }
    initFileStorage(config) {
        let logsDirectory = config.path;
        const dir = config.startPWD ? process.cwd() : '';
        logsDirectory = path.join(dir, path.normalize(config.path));
        const time = (new Date()).toUTCString().replace(/:/g, "-").replace(/,/, "");
        logsDirectory = path.join(logsDirectory, time);
        console.log(logsDirectory);
        fs.mkdirSync(logsDirectory, {
            recursive: true
        });
        this.fileTransports = {
            combined: fs.openSync(path.join(logsDirectory, 'combined.log'), 'a'),
            online: fs.openSync(path.join(logsDirectory, 'online.log'), 'a'),
            error: fs.openSync(path.join(logsDirectory, 'error.log'), 'a')
        };
    }
    initMongoStorage(uri) {
        mongo.MongoClient.connect(uri, (err, connection) => {
            if (err) {
                console.error(`Cannot connect to "${uri}"`, err);
                process.exit(1);
            }
            else {
                this.mongo = connection;
            }
        });
    }
}
exports.LoggerService = LoggerService;
exports.default = LoggerService;
