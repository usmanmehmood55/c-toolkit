const vscode = require('vscode');
const path   = require('path');

/**
 * Logger class for handling log messages via  a dedicated VS Code output channel.
 */
class Logger 
{
    /**
     * Constructor for the Logger.
     */
    constructor() 
    {
        /** @type {vscode.OutputChannel} */
        this.outputChannel = vscode.window.createOutputChannel('C Toolkit');
    }

    /**
     * Generic log function used by specific log level methods.
     * 
     * @param {string} message   The message to be logged.
     * @param {string} level     The severity level of the log ('INFO', 'WARN', 'ERR').
     * @param {string} stackInfo Information about where the log was called.
     */
    log(message, level, stackInfo)
    {
        const formattedMessage = `[${level}] [${stackInfo}] -> ${message}`;
        this.outputChannel.appendLine(formattedMessage);
    }

    /**
     * Parses the stack trace to find the caller location.
     * 
     * @returns {string} The parsed caller location in the format 'file:line:column'.
     */
    parseStackInfo()
    {
        const err = new Error();
        const stackLines = err.stack.split("\n");
        const callerLine = stackLines[3];

        // Extracting file name and function name
        const match = /at (.+) \((?:.*[\/\\])([^\/\\]+):\d+:\d+\)/.exec(callerLine) || [];
        const functionName = match[1] || 'anonymous';
        const fileName = match[2] ? path.basename(match[2]) : 'unknown';

        return `${fileName}:${functionName}`;
    }

    /**
     * Logs an informational message.
     * 
     * @param {string} message The informational message to log.
     */
    Info(message)
    {
        this.log(message, 'INFO', this.parseStackInfo());
    }

    /**
     * Logs a warning message.
     * 
     * @param {string} message The warning message to log.
     */
    Warning(message)
    {
        this.log(message, 'WARN', this.parseStackInfo());
    }

    /**
     * Logs an error message.
     * 
     * @param {string} message The error message to log.
     */
    Error(message)
    {
        this.log(message, 'ERR', this.parseStackInfo());
    }
}

module.exports = new Logger();
