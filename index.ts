import {NextFunction,  Request, Response} from "express";
import { MongoClientOptions } from 'mongodb'
import * as mongo from 'mongodb'
const styles = require('ansi-styles');
const fs = require('fs');
const path = require('path');
const util = require('util');
const logsFormat = require('./lib/formater');


declare global{
  namespace Express{
    interface Request {
      logger: Logger
    }
    interface Response {
      logger: Logger
    }
  }
}

export type Level = 'error' | 'warn' | 'log' | 'time' | 'info' | 'debug' |
  'ERROR' | 'WARN' | 'LOG' | 'TIME' | 'INFO' | 'DEBUG' | 1 | 2 | 3 | 4 | 5 | 6 | 'all';

export const LOG_LEVELS = {
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
export type LoggerConfig = {
  level: Level,
  file: {
    enable: boolean,
    level: Level,
    options: {
      path?: string,
      startPWD?: boolean
    }
  },
  console: {
    enable: boolean,
    level: Level,
  },
  mongodb: {
    enable?: boolean,
    level: Level,
    uri: string
  },
}

class TimeTracker{
  declare start: number;
  declare end: number;

  constructor() {
    this.start = Date.now();
  }
  stop() {
    this.end = Date.now();
    return this.runtime;
  }
  get runtime() {
    if (!this.end) {
      return ;
    }

    return this.end - this.start;
  }
  get startTime() {
    return this.getTime(this.start);
  }
  get endTime() {
    return this.getTime(this.end || this.start);
  }
  getTime(ms: number) {
    const date = new Date(ms);

    return date.getHours() + ':' + date.getMinutes();
  }
}

class Logger{
  static inc: number = 0;
  id: number;
  stack: any[] = [];

  logger: LoggerService;
  req: Request;
  res: Response;

  timing: TimeTracker;

  logs = [];

  constructor(req: Request, res: Response, logger: LoggerService) {
    this.id = ++Logger.inc;
    this.timing = new TimeTracker();

    this.logger = logger;
    this.req = req;
    this.res = res;
    const endFunc = res.end;
    res.end = (...params: any[]) => {
      // @ts-ignore
      endFunc.call(res, ...params);
      this.end();
    };

    this.init();
  }

  error(...message: any) {
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
  warn(...message: any) {
    if (this.isEnable('file', 'warn')) {
      this.logger.fileTransports.online.write(logsFormat.format(this.requestData, message));
    }

    this.stack.push({
      time: Date.now(),
      level: 'WARN',
      message
    });
  }
  log(...message: any) {
    if (this.isEnable('file', 'log')) {
      this.logger.fileTransports.online.write(logsFormat.format(this.requestData, message));
    }

    this.stack.push({
      time: Date.now(),
      level: 'LOG',
      message
    });
  }
  info(...message: any) {
    if (this.isEnable('file', 'info')) {
      this.logger.fileTransports.online.write(logsFormat.format(this.requestData, message));
    }

    this.stack.push({
      time: Date.now(),
      level: 'INFO',
      message
    });
  }
  debug(...message: any) {
    if (this.isEnable('file', 'debug')) {
      this.logger.fileTransports.online.write(logsFormat.format(this.requestData, message));
    }

    this.stack.push({
      time: Date.now(),
      level: 'DEBUG',
      message
    });
  }

  isEnable(transport: 'console' | 'file' | 'mongodb' = 'file', level: Level) {
    const config: {
      level: Level,
      enable?: boolean
    } = this.logger.config[transport] as {
      level: Level,
      enable?: boolean
    };

    if (!config || config.enable) {
      return false;
    }

    const minLogLevel = LOG_LEVELS[config.level];
    const currentLogLevel = LOG_LEVELS[level];
    return currentLogLevel >= minLogLevel;
  }

  writeCombinedLogs() {
    if (this.logger.config?.file) {
      let result = '';

      result += this.requestData + '\n';
      for (let log of this.stack) {
        if (this.isEnable('file', log.level)) {
          result += '  ' + `${ log.level } > ${ log.time } | `;
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
    return `${this.id} | ${ this.timing.startTime } | > ${ this.req.method }` +
      ` > ${ (this.req.ip || '') }` +
      ` > ${ this.req.originalUrl }`;
  }
  get responseData() {
    return `${this.id} | ${ this.timing.endTime } | < ${ this.res.statusCode } < ${ this.timing.runtime || '0' }`;
  }

  get styledRequestData() {
    return `${this.id} | ${ this.timing.startTime } | > ${ this.styledMethod }` +
      ` > ${ (this.req.ip || '') }` +
      ` > ${ this.req.originalUrl }`;
  }
  get styledResponseData() {
    return `${this.id} | ${ this.timing.endTime } | < ${ this.styledResponseStatus } < ${ this.styledExecutedTime }`;
  }

  get styledExecutedTime() {
    const ms = this.timing.runtime;

    if (!ms && ms !== 0) {
      return this.style(styles.color.red,'---');
    }

    if (ms < 60) {
      return this.style(styles.color.green, (ms || '0') + 'ms')
    } else if (ms < 120) {
      return this.style(styles.color.gray, ms + 'ms')
    } if (ms < 200) {
      return this.style(styles.color.yellow, ms + 'ms')
    } else {
      return this.style(styles.color.red, ms + 'ms')
    }
  }

  get styledResponseStatus() {
    const status = +this.res.statusCode;

    if (!status) {
      return this.style(styles.color.red, this.style(styles.bgGray,'----'));
    }

    let style;

    if (status < 300) {
      style = styles.color.green;
    } else if (status < 400) {
      style = styles.color.gray;
    } else if (status < 500) {
      style = styles.color.yellow;
    } else {
      style = styles.color.red;
    }

    return this.style(style, status.toString());
  }

  get styledMethod() {
    // @ts-ignore
    const style: any = {
      'GET': styles.color.green,
      'POST': styles.color.yellow,
      'PUT': styles.color.yellow,
      'DELETE': styles.color.red,
      'OPTIONS': styles.color.grey
    }[this.req.method.toUpperCase()] || styles.bgRedBright;

    return this.style(style, this.req.method.toUpperCase());
  }

  style(style: any, text: string) {
    return `${style.open}${text}${style.close}`;
  }
}

export class LoggerService{
  declare config: LoggerConfig;

  declare fileTransports: any;
  declare mongo: mongo.MongoClient;

  constructor(config: LoggerConfig) {
    this.config = config;

    if (this.config.file?.enable) {
      this.initFileStorage(this.config.file.options);
    }

    if (this.config.mongodb?.enable) {
      this.initMongoStorage(this.config.mongodb.uri);
    }
  }

  initFileStorage(config: any) {
    let logsDirectory = config.path;
    const dir = config.startPWD? process.cwd():'';
    logsDirectory = path.join(dir, path.normalize(config.path));

    const time =  (new Date()).toUTCString().replace(/:/g, "-").replace(/,/, "");
    logsDirectory = path.join(logsDirectory, time);
    console.log(logsDirectory);

    fs.mkdirSync(logsDirectory, {
      recursive: true
    });

    this.fileTransports = {
      combined: fs.openSync(path.join(logsDirectory, 'combined.log'), 'a'),
      online:   fs.openSync(path.join(logsDirectory, 'online.log'),   'a'),
      error:    fs.openSync(path.join(logsDirectory, 'error.log'),    'a')
    };
  }
  initMongoStorage(uri: string) {
    mongo.MongoClient.connect(uri, (err, connection) => {
      if (err) {
        console.error(`Cannot connect to "${uri}"`, err);
        process.exit(1);
      } else {
        this.mongo = connection;
      }
    })
  }

  middleware = (req: Request, res: Response, next: NextFunction) => {
    req.logger = new Logger(req, res, this);
    res.logger = req.logger;
    next();
  }
}

export default LoggerService;
