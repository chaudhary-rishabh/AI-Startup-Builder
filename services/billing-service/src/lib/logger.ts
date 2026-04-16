import winston from 'winston'

export const logger = winston.createLogger({
  level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
  format: winston.format.json(),
  defaultMeta: { service: 'billing-service' },
  transports: [new winston.transports.Console()],
})
