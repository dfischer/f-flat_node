import { transports, Logger } from 'winston';
import * as ProgressBar from 'progress';

export const log = new Logger({
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    timing: 3,
    trace: 4,
    debug: 5
  },
  transports: [new transports.Console()]
});

// log.cli();
log.level = (process.env as any).NODE_ENV || 'warn';

export const bar = new ProgressBar(
  ':elapsed s [:bar] S::stack Q::queue :: :lastAction',
  {
    complete: '=',
    incomplete: ' ',
    total: 100,
    width: 50,
    clear: true,
    renderThrottle: 1000,
    stream: process.stderr
  }
);
