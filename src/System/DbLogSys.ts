
import ip from 'ip'
import { dbMaster, dbProxy, adb } from './DBConnect';
import { v4 as uuidv4 } from 'uuid';
import { mFormatDateTime } from '../Helper/DateTimeH';
import _, { now, NumericDictionaryIterateeCustom } from 'lodash';
import { QueryContextI } from '../interface/CommonI';
import  knex, { Knex } from 'knex';
import { setInterval } from 'timers';
import { mRandomInteger } from '../Helper/NumberH';

const gQuery = knex({ // Knex mysql
    client: "mysql2"
})



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
        // if(!this.ixTable[msg.table]){
        //     this.ixTable[msg.table] = new DbTableC();
        //     await this.ixTable[msg.table].faInit(msg.table);
        // }

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



    /** Получить информацию по очереди */
    public async dbInit(){

        const bExistTable = await dbProxy.schema.hasTable('log_packet1');
        if(!bExistTable){
            await dbProxy.schema.createTable('log_packet1', (table:any) => {

                table.increments('id')
                    .comment('ID');

                table.boolean('status')
                    .index('status')
                    .comment('Статус');

                table.string('table_name', 255)
                    .comment('Имя таблицы');

                table.integer('json_data')
                    .comment('Данные');

                table.dateTime('created_at', null)
                    .notNullable()
                    .defaultTo(dbProxy.raw('CURRENT_TIMESTAMP'))
                    .comment('Время создания записи');
                    
            });
        }

        const bExistSchema = await dbProxy.schema.hasTable('log_packet2');
        if(!bExistSchema){
            await dbProxy.schema.createTable('log_packet2', (table:any) => {

                table.increments('id')
                    .comment('ID');

                table.boolean('status')
                    .index('status')
                    .comment('Статус');

                table.string('table_name', 255)
                    .comment('Имя таблицы');

                table.integer('json_data')
                    .comment('Данные');

                table.dateTime('created_at', null)
                    .notNullable()
                    .defaultTo(dbProxy.raw('CURRENT_TIMESTAMP'))
                    .comment('Время создания записи');
                    
            });
        }

        this.bInit = true;
        
    }
}