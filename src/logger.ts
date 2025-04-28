import pino, { Logger } from 'pino';

const transport = pino.transport({
  targets: [
    {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      },
    },
  ],
});

const logger: Logger = pino(transport);

// Export both logger instance and type
export type PinoLogger = Logger;
export default logger;
