// backend/src/config/logger.js
export const logger = {
  info: (msg, meta = {}) => {
    console.log(JSON.stringify({ level: 'INFO', time: new Date().toISOString(), message: msg, ...meta }));
  },
  warn: (msg, meta = {}) => {
    console.warn(JSON.stringify({ level: 'WARN', time: new Date().toISOString(), message: msg, ...meta }));
  },
  error: (msg, meta = {}) => {
    console.error(JSON.stringify({ level: 'ERROR', time: new Date().toISOString(), message: msg, ...meta }));
  },
  debug: (msg, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(JSON.stringify({ level: 'DEBUG', time: new Date().toISOString(), message: msg, ...meta }));
    }
  }
};
