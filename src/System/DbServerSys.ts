
import ip from 'ip'
import { dbMaster, dbProxy, adb, gixDb } from './DBConnect';
import { v4 as uuidv4 } from 'uuid';
import { mFormatDateTime } from '../Helper/DateTimeH';
import _, { now, NumericDictionaryIterateeCustom } from 'lodash';
import { QueryContextI } from '../interface/CommonI';
import  knex, { Knex } from 'knex';
import { setInterval } from 'timers';
import { mRandomInteger } from '../Helper/NumberH';
import { DbLogSys } from './DbLogSys';
import { cfDb } from '../Config/MainConfig';

const gQuery = knex({ // Knex mysql
    client: "mysql2"
})

const gDbLogSys = new DbLogSys();

/** Компонент Очередь */
export class DbTableC {
    public table:string = '';
    public id:number = 0;
    public idSchema:number = 0;
    private statusMaster:any = null;
    private statusProxy:any = null;

    public aQueryInsertLog:string[] = [];
    public aQueryUpdateLog:string[] = [];
    public aQueryDeleteLog:string[] = [];

    /** инициализация таблицы */
    async faInit(sTable:string){
        this.table = sTable;
        this.statusMaster = (await dbMaster.raw(`SHOW TABLE STATUS LIKE :table;`,{
            // db:conf.cfDbMaster.connection.database,
            table:sTable
        }))[0][0]

        // const lastid = (await dbMaster.raw(`SELECT LAST_INSERT_ID() as id`))[0][0]?.id;

        const idAutoMaster = this.statusMaster ? this.statusMaster['Auto_Increment'] || 0 : 0;
        const idLastInsertMaster = this.statusMaster ? (await dbMaster.raw(`SELECT LAST_INSERT_ID() as id`))[0][0]?.id || 0 : 0;
        const idMaxMaster = this.statusMaster ? (await dbMaster(sTable).max({id:'id'}))[0]?.id || 0 : 0;

        this.statusProxy = (await dbProxy('table').where('table',sTable).select())[0];

        if(!this.statusProxy){
            await dbProxy('table').where('table',sTable).insert({
                table:sTable
            }).onConflict().ignore()
        }
        const idAutoProxy = this.statusProxy?.table_id || 0;
        this.idSchema = this.statusProxy?.schema_id || 0;

        this.id = idAutoMaster 
        this.id = this.id < idLastInsertMaster ? idLastInsertMaster : this.id;
        this.id = this.id < idMaxMaster ? idMaxMaster : this.id;
        this.id = this.id < idAutoProxy ? idAutoProxy : this.id;

        console.log('=====',this.id );

        // TODO так-же нужно получать автоинкремент из proxy DB на случай если нет свежей БД master

        // this.id = this.status['Auto_Increment'] || 0;
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
export class DbServerSys {
    
    private idSchema = 0;
    private bInit = false;
    private ixTable:Record<string, DbTableC> = {};

    

    /** Получить из очереди */
    public async id(msg:QueryContextI):Promise<number[]>{
        if(!this.ixTable[msg.table]){
            this.ixTable[msg.table] = new DbTableC();
            await this.ixTable[msg.table].faInit(msg.table);
        }

        const vTableC = this.ixTable[msg.table];


        return vTableC.getNewID(msg.data.cnt);
    }

    /** Поместить значение в очередь */
    public async schema(msg:QueryContextI){
        if(!this.ixTable[msg.table]){
            this.ixTable[msg.table] = new DbTableC();
            await this.ixTable[msg.table].faInit(msg.table);
        }

        const vTableC = this.ixTable[msg.table];

        const idSchema = (await dbProxy('schema').insert({
            table:msg.table,
            data:msg.query
        }))[0]

        this.idSchema = idSchema;
        vTableC.idSchema = idSchema;

        const aQuery = msg.query.split(';');

        for (let c = 0; c < aQuery.length; c++) {
            const sQuery = aQuery[c];

            let aPromiseQuery:Promise<Knex>[] = [];
            for (let i = 0; i < adb.length; i++) {
                const db = adb[i];

                aPromiseQuery.push(db.raw(sQuery))
                
            }

            await Promise.all(aPromiseQuery);
            aPromiseQuery = [];
        }
        

        return idSchema;

    }

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
        if(!this.ixTable[msg.table]){
            this.ixTable[msg.table] = new DbTableC();
            await this.ixTable[msg.table].faInit(msg.table);
        }

        const vTableC = this.ixTable[msg.table];

        console.log('t>>>',msg.table,msg.data);

        const sQuery = gQuery(msg.table).insert(msg.data).onConflict().merge().toString()
        vTableC.aQueryInsertLog.push(sQuery)

        const aPromiseQuery:Promise<Knex>[] = [];
        for (let i = 0; i < adb.length; i++) {
            const db = adb[i];
            aPromiseQuery.push(db.raw(sQuery))
        }
        await Promise.all(aPromiseQuery);
        await gDbLogSys.insert(msg);

        process.stdout.write('.')

    }

    /** Получить количество сообщений в очереди */
    public async update(msg:QueryContextI){
        if(!this.ixTable[msg.table]){
            this.ixTable[msg.table] = new DbTableC();
            await this.ixTable[msg.table].faInit(msg.table);
        }

        const vTableC = this.ixTable[msg.table];

        // Случайно отдаем одну базу данных из пула
        const iRand = mRandomInteger(0, adb.length - 1)
        const dbSelect = adb[iRand];

        const a = (await dbSelect.raw(msg.query))[0];

        console.log(msg.query);
        console.log('---1>',a)
        const aid = a.map((el:any) => el[msg.key_in]);
        console.log('---2>',aid)

        
        if(aid.length){
            const sQuery = gQuery(msg.table).whereIn(msg.key_in, aid).update(msg.data).toString();
            vTableC.aQueryUpdateLog.push(sQuery)

            const aPromiseQuery:Promise<Knex>[] = [];
            for (let i = 0; i < adb.length; i++) {
                const db = adb[i];
                console.log(db(msg.table).whereIn(msg.key_in, aid).update(msg.data).toString())
                aPromiseQuery.push(db.raw(sQuery));
                
            }
            await Promise.all(aPromiseQuery);
            await gDbLogSys.update(aid,msg);
        }

        return aid;
    }

    /** Получить информацию по очереди */
    public async delete(msg:QueryContextI): Promise<any>{

        if(!this.ixTable[msg.table]){
            this.ixTable[msg.table] = new DbTableC();
            await this.ixTable[msg.table].faInit(msg.table);
        }

        const vTableC = this.ixTable[msg.table];

        // Случайно отдаем одну базу данных из пула
        const iRand = mRandomInteger(0, adb.length - 1)
        const dbSelect = adb[iRand];

        const a = (await dbSelect.raw(msg.query))[0];

        console.log(msg.query);
        console.log('---1>',a)
        const aid = a.map((el:any) => el[msg.key_in]);
        console.log('---2>',aid)

        if(aid.length){

            const sQuery = gQuery(msg.table).whereIn(msg.key_in, aid).delete(msg.data).toString();
            vTableC.aQueryDeleteLog.push(sQuery)

            const aPromiseQuery:Promise<Knex>[] = [];
            for (let i = 0; i < adb.length; i++) {
                const db = adb[i];
                aPromiseQuery.push(db.raw(sQuery));
            }
            await Promise.all(aPromiseQuery);
        }

        return aid;
    }

    /** Получить информацию по очереди */
    public async dbInit(){

        const bExistTable = await dbProxy.schema.hasTable('table');
        if(!bExistTable){
            await dbProxy.schema.createTable('table', (table:any) => {

                table.increments('id')
                    .comment('ID');

                table.string('table', 100)
                    .unique('table')
                    .comment('Таблица');

                table.bigInteger('table_id')
                    .comment('table_id');

                table.integer('schema_id')
                    .comment('schema_id');

                table.dateTime('created_at', null)
                    .notNullable()
                    .defaultTo(dbProxy.raw('CURRENT_TIMESTAMP'))
                    .comment('Время создания записи');

                table.dateTime('updated_at')
                    .notNullable()
                    .defaultTo(dbProxy.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
                    .comment('Время обновления записи');
                    
            });
        }

        const bExistSchema = await dbProxy.schema.hasTable('schema');
        if(!bExistSchema){
            await dbProxy.schema.createTable('schema', (table:any) => {

                table.increments('id')
                    .comment('ID');

                table.string('table', 100)
                    .index('table')
                    .comment('Таблица');

                table.text('data')
                    .comment('data');

                table.dateTime('created_at', null)
                    .index('created_at')
                    .notNullable()
                    .defaultTo(dbProxy.raw('CURRENT_TIMESTAMP'))
                    .comment('Время создания записи');
                    
            });
        }

        // Базы данных в репликации
        const aDbReplication = [
            ...adb,
            dbProxy
        ];
        for (let i = 0; i < aDbReplication.length; i++) {
            const vDbReplication = aDbReplication[i];
            
            const bExistReplication = await vDbReplication.schema.hasTable('replication');
            if(!bExistReplication){
                await vDbReplication.schema.createTable('replication', (table:any) => {

                    table.increments('id')
                        .comment('ID');

                    table.string('ip', 50)
                        .index('ip')
                        .comment('IP адрес БД = 127.0.0.1:3306');

                    table.integer('schema')
                        .defaultTo(0)
                        .comment('Уроверь репликации схемы');

                    table.boolean('query_sync_ok')
                        .defaultTo(false)
                        .comment('Статус синхронизации OK');

                    // ===========================================

                    table.bigInteger('query_start_id')
                        .defaultTo(0)
                        .comment('Запрос с которого стартуем синхронизацию');

                    table.bigInteger('query_min_id')
                        .defaultTo(0)
                        .comment('Минимальный ID обработанного запроса');
                        
                    table.bigInteger('query_max_id')
                        .defaultTo(0)
                        .comment('Минимальный ID обработанного запроса');

                    
                    // ===========================================

                    table.bigInteger('query_insert_id')
                        .defaultTo(0)
                        .comment('Последний обработанный insert запрос');

                    table.boolean('query_insert_ok')
                        .defaultTo(false)
                        .comment('query_insert_ok');

                    // ===========================================

                    table.bigInteger('query_delete_id')
                        .defaultTo(0)
                        .comment('Последний обработанный delete запрос');

                    table.boolean('query_delete_ok')
                        .defaultTo(false)
                        .comment('query_delete_ok');

                    // ===========================================

                    table.bigInteger('query_update_id')
                        .defaultTo(0)
                        .comment('query_update_id');

                    table.boolean('query_update_ok')
                        .defaultTo(false)
                        .comment('Последний обработанный update запрос');

                    // ===========================================

                    table.dateTime('created_at', null)
                        .notNullable()
                        .defaultTo(dbProxy.raw('CURRENT_TIMESTAMP'))
                        .comment('Время создания записи');

                    table.dateTime('updated_at')
                        .notNullable()
                        .defaultTo(dbProxy.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
                        .comment('Время обновления записи');
                        
                });
            }
        }
        

        const bExistQuery = await dbProxy.schema.hasTable('query');
        if(!bExistQuery){
            await dbProxy.schema.createTable('query', (table:any) => {

                table.bigIncrements('id')
                    .comment('ID');

                table.string('table', 100)
                    .index('table')
                    .comment('Таблица');

                table.integer('schema_id')
                    .index('schema_id')
                    .comment('Таблица');

                table.enum('cmd',['insert', 'update', 'delete'])
                    .index('cmd')
                    .comment('Таблица');

                table.text('data')
                    .comment('Таблица');

                table.dateTime('created_at', null)
                    .index('created_at')
                    .notNullable()
                    .defaultTo(dbProxy.raw('CURRENT_TIMESTAMP'))
                    .comment('Время создания записи');

            });
        }

        const bExistLogPacket1 = await dbProxy.schema.hasTable('log_packet1');
        if(!bExistLogPacket1){
            await dbProxy.schema.createTable('log_packet1', (table:any) => {

                table.increments('id')
                    .comment('ID');

                table.boolean('status')
                    .index('status')
                    .defaultTo(0)
                    .comment('Статус');

                table.string('table', 255)
                    .comment('Имя таблицы');

                table.text('data')
                    .comment('Данные');

                table.dateTime('created_at', null)
                    .notNullable()
                    .defaultTo(dbProxy.raw('CURRENT_TIMESTAMP'))
                    .comment('Время создания записи');
                    
            });
        }

        const bExistLogPacket2 = await dbProxy.schema.hasTable('log_packet2');
        if(!bExistLogPacket2){
            await dbProxy.schema.createTable('log_packet2', (table:any) => {

                table.increments('id')
                    .comment('ID');

                table.boolean('status')
                    .index('status')
                    .defaultTo(0)
                    .comment('Статус');

                table.string('table', 255)
                    .comment('Имя таблицы');

                table.text('data')
                    .comment('Данные');

                table.dateTime('created_at', null)
                    .notNullable()
                    .defaultTo(dbProxy.raw('CURRENT_TIMESTAMP'))
                    .comment('Время создания записи');
                    
            });
        }


        this.idSchema = (await dbProxy('schema').max({id:'id'}))[0]?.id || 0;

        console.log('this.idSchema',this.idSchema);

        this.bInit = true;
        
    }


    /** Сохранить информацию по очереди */
    public async dbSave(){

        const aDbLog:any[] = []; // Данные для сохранения

        const akTable = Object.keys(this.ixTable);
        for (let i = 0; i < akTable.length; i++) {
            const kTable = akTable[i];
            const vDbTableC = this.ixTable[kTable];

            const aInsertLog = vDbTableC.aQueryInsertLog;
            vDbTableC.aQueryInsertLog = [];
            for (let j = 0; j < aInsertLog.length; j++) {
                const sInsertLog = aInsertLog[j];
                aDbLog.push({
                    table:kTable,
                    schema_id:this.idSchema,
                    cmd:'insert',
                    data:sInsertLog
                })
            }
            

            const aUpdateLog = vDbTableC.aQueryUpdateLog;
            vDbTableC.aQueryUpdateLog = [];
            for (let j = 0; j < aUpdateLog.length; j++) {
                const sUpdateLog = aUpdateLog[j];
                aDbLog.push({
                    table:kTable,
                    schema_id:this.idSchema,
                    cmd:'update',
                    data:sUpdateLog
                })
            }

            const aDeleteLog = vDbTableC.aQueryDeleteLog;
            vDbTableC.aQueryDeleteLog = [];
            for (let j = 0; j < aDeleteLog.length; j++) {
                const sDeleteLog = aDeleteLog[j];
                aDbLog.push({
                    table:kTable,
                    schema_id:this.idSchema,
                    cmd:'delete',
                    data:sDeleteLog
                })
            }
        }


        if(aDbLog.length){
            const aaQueryChunk = _.chunk(aDbLog, 1000);
            let aPromise:Promise<any>[] = [];
            for (let i = 0; i < aaQueryChunk.length; i++) {
                const aQueryChunk = aaQueryChunk[i];
                
                aPromise.push(dbProxy('query').insert(aQueryChunk));
                if(aPromise.length > 100){
                    await Promise.all(aPromise);
                    aPromise = [];
                }
            }
            await Promise.all(aPromise);

        }

        { // Обновление данных по таблицам
            let aPromise:Promise<any>[] = [];
            for (let i = 0; i < akTable.length; i++) {
                const kTable = akTable[i];
                const vDbTableC = this.ixTable[kTable];

                aPromise.push(dbProxy('table').where('table',kTable).update({
                    schema_id:vDbTableC.idSchema,
                    table_id:vDbTableC.id
                }))
            }
            await Promise.all(aPromise);
        }
        
    }

    /** Сохранить информацию по очереди */
    public async dbReplication(){
        for (let i = 0; i < cfDb.length; i++) {
            const vCfDb = cfDb[i];

            if( vCfDb.connection.database != 'test_proxy_master1'){
                console.log('Пропуск репликации тестирование - ', vCfDb.connection.database)
                continue;
            }

            console.log('>>>dbReplication1>>>')
        
            const kDb = [vCfDb.connection.host, vCfDb.connection.port, vCfDb.connection.database].join(':');
            const vDbMaster = gixDb[kDb]

            console.log('>>>dbReplication2>>>', kDb)

            const vReplicationProxy = await dbProxy('replication')
                .where('ip',kDb)
                .orderBy('id', 'desc')
                .first()


            console.log('>>>dbReplication3>>>', 'proxy', vReplicationProxy)

                

            if(!vReplicationProxy){
                await dbProxy('replication')
                    .insert({ip:kDb})

                continue;
            }

            const vReplicationMaster = await vDbMaster('replication')
                .where('ip',kDb)
                .orderBy('id', 'desc')
                .first()

            console.log('>>>dbReplication4>>>', 'master', vReplicationProxy)

            if(!vReplicationMaster){
                await vDbMaster('replication')
                    .insert({ip:kDb})

                continue;
            }

            let bSync = false;
            if(!vReplicationProxy.query_sync_ok || !vReplicationMaster.query_sync_ok){
                bSync = true;
            }

            console.log('>>>dbReplication5>>>', 'sync', bSync)

            const idMaxQuery = (await dbProxy('query')
                .max({id:'id'}))[0]?.id || 0;

            console.log('>>>dbReplication6>>>', 'idMaxQuery', idMaxQuery)

            if(bSync){

                let iQuery = 0;

                console.log('>>>dbReplication7>>>',vReplicationMaster.query_insert_id,'<',idMaxQuery)
                if(vReplicationMaster.query_insert_id < idMaxQuery){
                    const aQueryInsert = (await dbProxy('query')
                        .where({
                            schema_id:vReplicationMaster.schema,
                            cmd:'insert'
                        })
                        .select('data')
                        .limit(1000)
                    ).map(el => el.data)

                    console.log('>>>dbReplication8>>>', 'aQueryInsert', aQueryInsert.length)

                    iQuery+=aQueryInsert.length;
                    
                    for (let i = 0; i < aQueryInsert.length; i++) {
                        console.log(aQueryInsert[i]);
                        await vDbMaster.raw(aQueryInsert[i]);
                        
                    }

                    
                }

                if(!iQuery){
                    (await vDbMaster('replication')
                        .where('id',vReplicationMaster.id)
                        .update({schema:vReplicationMaster.schema+1})
                    );
                }
            }
            
            
            

        }
    }
}