//Конфигурация

import * as dotenv from 'dotenv'
import * as localConfig from './LocalConfig'
let envConfig = dotenv.config().parsed;



// Устанавливаем локальный или серверный конфиг
let conf = null;
conf = localConfig;

// Конфигурация базы данных
export const mysql = conf.mysql;

// Общие настройки
export const common = conf.common;

// Редис
export const redis = conf.redis;

// // Кролик система очередей
// export const rabbit = conf.rabbit;

// S3 хранилище
export const S3 = conf.S3;

