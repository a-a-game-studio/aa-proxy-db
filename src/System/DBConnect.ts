import  knex, { Knex } from 'knex';
import { cfDb, cfDbMaster, cfDbProxy } from "../Config/MainConfig";

export const dbProxy = knex(cfDbProxy);

export const dbMaster = knex(cfDbMaster);

export const adb:Knex[] = [];

export const gixDb:Record<string, Knex> = {};
export const gixaDbByIp:Record<string, Knex[]> = {};

for (let i = 0; i < cfDb.length; i++) {
    const vCfDb = cfDb[i];
    const vDb = knex(vCfDb);
    adb.push(vDb);

    const sKeyDb = [vCfDb.connection.host, vCfDb.connection.port, vCfDb.connection.database].join(':')
    gixDb[sKeyDb] = vDb;

    if(!gixaDbByIp[vCfDb.connection.host]){
        gixaDbByIp[vCfDb.connection.host] = [];
    }
    gixaDbByIp[vCfDb.connection.host].push(vDb)
    
}