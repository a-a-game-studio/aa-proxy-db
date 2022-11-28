
import ip from 'ip'
import { dbMaster, dbProxy, adb } from './DBConnect';
import { v4 as uuidv4 } from 'uuid';
import { mFormatDateTime } from '../Helper/DateTimeH';
import _, { now, NumericDictionaryIterateeCustom } from 'lodash';
import { MsgContextI } from '../interface/CommonI';
import * as conf from '../Config/MainConfig'
import  knex, { Knex } from 'knex';
import { setInterval } from 'timers';
import { mRandomInteger } from '../Helper/NumberH';

/** Компонент Очередь */
export class DbTableC {
    private table:string = '';
    private id:number = 0;
    private status:any = null;

    /** инициализация таблицы */
    async faInit(sTable:string){
        this.table = sTable;
        this.status = (await dbMaster.raw(`SHOW TABLE STATUS LIKE :table;`,{
            // db:conf.cfDbMaster.connection.database,
            table:sTable
        }))[0]

        console.log(this.status);

        // TODO так-же нужно получать автоинкремент из proxy DB на случай если нет свежей БД master

        this.id = this.status['Auto_Increment'] || 0;
    }

    getLastID(){
        return this.id;
    }

    /** Получить список id для вставки данных */
    getNewID(cnt:number){
        const aid:number[] = [];
        for (let i = 0; i < cnt; i++) {
            aid.push(++this.id);
        }
        return aid;
    }
}

/** Система очередей */
export class MqServerSys {
    
    private ixTable:Record<string, DbTableC> = {};

    /** Получить из очереди */
    public async id(msg:MsgContextI):Promise<number[]>{
        if(!this.ixTable[msg.table]){
            this.ixTable[msg.table] = new DbTableC();
            await this.ixTable[msg.table].faInit(msg.table);
        }

        const vTableC = this.ixTable[msg.table];


        return vTableC.getNewID(msg.data.cnt);
    }

    /** Получить из очереди */
    public async select(msg:MsgContextI){
        if(!this.ixTable[msg.table]){
            this.ixTable[msg.table] = new DbTableC();
            await this.ixTable[msg.table].faInit(msg.table);
        }

        const vTableC = this.ixTable[msg.table];

        // Случайно отдаем одну базу данных из пула
        const iRand = mRandomInteger(0, adb.length - 1)
        const db = adb[iRand];
        const out = db.raw(msg.query);

        return out
        
    }
    
    /** Поместить значение в очередь */
    public async insert(msg:MsgContextI){
        if(!this.ixTable[msg.table]){
            this.ixTable[msg.table] = new DbTableC();
            await this.ixTable[msg.table].faInit(msg.table);
        }

        const vTableC = this.ixTable[msg.table];

        console.log('t>>>',msg.table,msg.data);

        const aPromiseQuery:Promise<Knex>[] = [];
        for (let i = 0; i < adb.length; i++) {
            const db = adb[i];
            aPromiseQuery.push(db(msg.table).insert(msg.data))
        }
        await Promise.all(aPromiseQuery);

        process.stdout.write('.')

    }

    /** Получить количество сообщений в очереди */
    public async update(msg:MsgContextI){
        if(!this.ixTable[msg.table]){
            this.ixTable[msg.table] = new DbTableC();
            await this.ixTable[msg.table].faInit(msg.table);
        }

        const vTableC = this.ixTable[msg.table];

        // Случайно отдаем одну базу данных из пула
        const iRand = mRandomInteger(0, adb.length - 1)
        const dbSelect = adb[iRand];

        const aid = (await dbSelect.raw(msg.query))[0];
        
        const aPromiseQuery:Promise<Knex>[] = [];
        for (let i = 0; i < adb.length; i++) {
            const db = adb[i];
            aPromiseQuery.push(db(msg.table).whereIn('id', aid).update(msg.data));
        }
        await Promise.all(aPromiseQuery);
    }

    /** Получить информацию по очереди */
    public async delete(msg:MsgContextI): Promise<any>{

        if(!this.ixTable[msg.table]){
            this.ixTable[msg.table] = new DbTableC();
            await this.ixTable[msg.table].faInit(msg.table);
        }

        const vTableC = this.ixTable[msg.table];

        // Случайно отдаем одну базу данных из пула
        const iRand = mRandomInteger(0, adb.length - 1)
        const dbSelect = adb[iRand];

        const aid = (await dbSelect.raw(msg.query))[0];

        const aPromiseQuery:Promise<Knex>[] = [];
        for (let i = 0; i < adb.length; i++) {
            const db = adb[i];
            aPromiseQuery.push(db(msg.table).whereIn('id', aid).delete(msg.data));
        }
        await Promise.all(aPromiseQuery);

        // return vTableC.info();
    }

    /** Получить информацию по очереди */
    public async dbInit(){

        const bExistTable = await dbProxy.schema.hasTable('table');
        if(!bExistTable){
            await dbProxy.schema.createTable('table', (table:any) => {

                table.increments('id')
                    .comment('ID');

                table.string('ip', 20)
                    .index('ip')
                    .comment('IP адрес базы данных');

                table.string('db', 100)
                    .index('db')
                    .comment('База данных');

                table.string('table', 100)
                    .index('table')
                    .comment('Таблица');

                table.bigInteger('table_id')
                    .comment('table_id');

                table.dateTime('created_at', null)
                    .index('created_at')
                    .notNullable()
                    .defaultTo(dbProxy.raw('CURRENT_TIMESTAMP'))
                    .comment('Время создания записи');

                table.dateTime('updated_at')
                    .index('updated_at')
                    .notNullable()
                    .defaultTo(dbProxy.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
                    .comment('Время обновления записи');
                    
            });
        }
        
    }


    /** Сохранить информацию по очереди */
    public async dbSave(){

        const aMqLog:any[] = []; // Данные для сохранения

        const akQueue = Object.keys(this.ixTable);
        for (let i = 0; i < akQueue.length; i++) {
            const kQueue = akQueue[i];
            const vMqQueueC = this.ixTable[kQueue];   
        }
        
    }
}