import  knex, { Knex } from 'knex';
import { option, common, aCfDb, cfDbMaster, cfDbProxy } from "../Config/MainConfig";


export const dbProxy = knex(cfDbProxy);

export const dbMaster = knex(cfDbMaster);

export const adb:Record<string, Knex> = {};
export const adbError:Record<string, Knex> = {};
export const adbWait:Record<string, Knex> = {};
export const ixDbWaitTime:Record<string, number> = {};


export const gixDb:Record<string, Knex> = {};
export const gixaDbByIp:Record<string, Knex[]> = {};


for (const [kCfDb, vCfDb] of Object.entries(aCfDb)) {
    
    // const vCfDb = aCfDb[keyDb];
    const vDb = knex(vCfDb);
    adb[kCfDb] = vDb;

    const sKeyDb = [vCfDb.connection.host, vCfDb.connection.port, vCfDb.connection.database].join(':')
    gixDb[sKeyDb] = vDb;

    if(!gixaDbByIp[vCfDb.connection.host]){
        gixaDbByIp[vCfDb.connection.host] = [];
    }
    gixaDbByIp[vCfDb.connection.host].push(vDb)
    
}