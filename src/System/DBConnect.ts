import  knex, { Knex } from 'knex';
import { cfDb, cfDbMaster, cfDbProxy } from "../Config/MainConfig";

export const dbProxy = knex(cfDbProxy);

export const dbMaster = knex(cfDbMaster);

export const adb:Knex[] = [];

for (let i = 0; i < cfDb.length; i++) {
    adb.push(knex(cfDb[i]));
    
}