import fs from 'fs';
import path from 'path';
import { format } from 'util';

// Log levels
export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    FATAL = 'fatal'
}

// Log entry interface
interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    meta?: any;
}

export class Logger {
    private logDir: string;
    private env: string;

    constructor() {
        this.env = process.env.NODE_ENV || 'development';
        this.logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

        // Ensure log directory exists
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    private formatMessage(level: LogLevel, message: string, meta?: any): string {
        const timestamp = new Date().toISOString();
        const logEntry: LogEntry = {
            timestamp,
            level,
            message,
            meta
        };

        return JSON.stringify(logEntry);
    }

    private writeToFile(level: LogLevel, message: string): void {
        const logFile = path.join(this.logDir, `${level}.log`);
        fs.appendFileSync(logFile, message + '\n');
    }

    private log(level: LogLevel, message: string, ...meta: any[]): void {
        const formattedMessage = this.formatMessage(level, message, meta.length > 0 ? meta : undefined);

        // Write to console
        switch (level) {
            case LogLevel.DEBUG:
                if (this.env === 'development') {
                    console.debug(formattedMessage);
                }
                break;
            case LogLevel.INFO:
                console.info(formattedMessage);
                break;
            case LogLevel.WARN:
                console.warn(formattedMessage);
                break;
            case LogLevel.ERROR:
            case LogLevel.FATAL:
                console.error(formattedMessage);
                break;
        }

        // Write to file
        this.writeToFile(level, formattedMessage);
    }

    debug(message: string, ...meta: any[]): void {
        this.log(LogLevel.DEBUG, message, ...meta);
    }

    info(message: string, ...meta: any[]): void {
        this.log(LogLevel.INFO, message, ...meta);
    }

    warn(message: string, ...meta: any[]): void {
        this.log(LogLevel.WARN, message, ...meta);
    }

    error(message: string, ...meta: any[]): void {
        this.log(LogLevel.ERROR, message, ...meta);
    }

    fatal(message: string, ...meta: any[]): void {
        this.log(LogLevel.FATAL, message, ...meta);
    }
}

// Create a singleton logger instance
export const logger = new Logger();