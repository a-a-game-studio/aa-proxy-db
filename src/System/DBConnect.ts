import knex from "knex";
import { cfDb, cfDbMaster, cfDbProxy } from "../Config/MainConfig";

export const dbProxy = knex(cfDbProxy);

export const dbMaster = knex(cfDbMaster);

export const adb:knex.QueryBuilder[] = [];

for (let i = 0; i < cfDb.length; i++) {
    adb.push(knex(cfDb[i]));
    
}