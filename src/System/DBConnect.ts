import knex from "knex";
import { cfDbMaster, cfDbProxy, cfDbProxy2, cfDbSlave1, cfDbSlave2 } from "../Config/MainConfig";

export const dbProxy = knex(cfDbProxy);

export const dbProxy2 = knex(cfDbProxy2);

export const dbMaster = knex(cfDbMaster);

export const dbSlave1 = knex(cfDbSlave1);

export const dbSlave2 = knex(cfDbSlave2);