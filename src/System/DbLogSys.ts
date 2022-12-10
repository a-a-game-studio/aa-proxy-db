
import ip from 'ip'
import { dbMaster, dbProxy, adb } from './DBConnect';
import { v4 as uuidv4 } from 'uuid';
import { mFormatDateTime } from '../Helper/DateTimeH';
import _, { now, NumericDictionaryIterateeCustom } from 'lodash';
import { QueryContextI } from '../interface/CommonI';
import  knex, { Knex } from 'knex';
import { setInterval } from 'timers';
import { mRandomInteger } from '../Helper/NumberH';
import { cfDbLog, cfLogChange } from '../Config/MainConfig';

const gQuery = knex({ // Knex mysql
    client: "mysql2"
})

const gixLogChangeByFrom = _.groupBy(cfLogChange.table, 'from')

/** Система очередей */
export class DbLogSys {
    
    private idSchema = 0;
    private bInit = false;

    /** Получить из очереди */
    public async select(msg:QueryContextI){

        // const vTableC = this.ixTable[msg.table];

        // Случайно отдаем одну базу данных из пула
        const iRand = mRandomInteger(0, adb.length - 1)
        const db = adb[iRand];
        const out = (await db.raw(msg.query))[0];

        return out
        
    }
    
    /** Поместить значение в очередь */
    public async insert(msg:QueryContextI){


        console.log('===LOG====')
        if(!gixLogChangeByFrom[msg.table]){
            return; // Прерывание
        }

        console.log('===LOG1====')

        const aLog:{table:string, data:string}[] = [];

        const aTrigger = gixLogChangeByFrom[msg.table];
        for (let i = 0; i < aTrigger.length; i++) {
            const vTrigger = aTrigger[i];

            console.log('===LOG2====')

            if(msg.data.length){
                for (let j = 0; j < msg.data.length; j++) {
                    const vRow = msg.data[j];
                
                    aLog.push({table:vTrigger.to, data:JSON.stringify(vRow)});
                }
            } else {
                aLog.push({table:vTrigger.to, data:JSON.stringify(msg.data)});
                
            }
        }

        await dbProxy(cfLogChange.logBuffer.log1).insert(aLog);
    }

    /** Поместить значение в очередь */
    public async update(msg:QueryContextI){
        
        if(!gixLogChangeByFrom[msg.table]){
            return; // Прерывание
        }

        const iRand = mRandomInteger(0, adb.length - 1)
        const db = adb[iRand];
        const out = (await db.raw(msg.query))[0];

        // const vTableC = this.ixTable[msg.table];

        const sQuery = gQuery(msg.table).insert(msg.data).toString()
        // vTableC.aQueryInsertLog.push(sQuery)

        const aPromiseQuery:Promise<Knex>[] = [];
        for (let i = 0; i < adb.length; i++) {
            const db = adb[i];
            aPromiseQuery.push(db.raw(sQuery))
        }
        await Promise.all(aPromiseQuery);


        process.stdout.write('.')

    }

}