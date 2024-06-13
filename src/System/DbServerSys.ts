
import ip from 'ip'
import { dbMaster, dbProxy, adb, gixDb, adbError, adbWait, ixDbWaitTime } from './DBConnect';
import { v4 as uuidv4 } from 'uuid';
import { mFormatDate, mFormatDateTime } from '../Helper/DateTimeH';
import _ from 'lodash';
import { QueryContextI, QueryStatusI } from '../interface/CommonI';
import  knex, { Knex } from 'knex';
import { setInterval } from 'timers';
import { mRandomInteger } from '../Helper/NumberH';
import { DbLogSys } from './DbLogSys';
import * as conf from '../Config/MainConfig';
import dayjs from 'dayjs';



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

    public columnSpecial = {
        primary:'id',
        created_at:'',
        updated_at:''
    }

    /** инициализация таблицы */
    async faInit(sTable:string){
        this.table = sTable;

        try {
            this.statusMaster = (await dbMaster.raw(`SHOW TABLE STATUS LIKE :table;`,{
                // db:conf.cfDbMaster.connection.database,
                table:sTable
            }))[0][0]

            this.statusProxy = (await dbProxy('table').where('table',sTable).select())[0];

            if(!this.statusProxy){
                await dbProxy('table').where('table',sTable).insert({
                    table:sTable
                }).onConflict().ignore()
            } else {
                this.columnSpecial.primary = this.statusProxy['col_primary'];
                this.columnSpecial.created_at = this.statusProxy['col_created_at'];
                this.columnSpecial.updated_at = this.statusProxy['col_updated_at'];
            }

            console.log('this.columnSpecial.primary>>>',this.columnSpecial.primary);
            const idAutoMaster = this.statusMaster ? this.statusMaster['Auto_Increment'] || 0 : 0;
            const idMaxMaster = this.statusMaster ? (await dbMaster(sTable).max({id:this.columnSpecial.primary || 'id'}))[0]?.id || 0 : 0;

            

            // Синхронизировать специальные колонки
            await this.syncSchemaSpecialColumn();

            const idAutoProxy = this.statusProxy?.table_id || 0;
            this.idSchema = this.statusProxy?.schema_id || 0;

            this.id = this.id < idAutoMaster ? idAutoMaster : this.id;
            // this.id = this.id < idLastInsertMaster ? idLastInsertMaster : this.id;
            this.id = this.id < idMaxMaster ? idMaxMaster : this.id;
            this.id = this.id < idAutoProxy ? idAutoProxy : this.id;

            // console.log('=====',this.id );

        } catch(e){
            console.log('>>>INIT_TABLE>>>',e)
        }
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


    async syncSchemaSpecialColumn(){
        const sql = `
            SELECT 
            COLUMN_NAME,
                col.COLUMN_KEY,
                if(col.COLUMN_KEY = 'PRI', COLUMN_NAME, '') as 'primary',
                if(col.COLUMN_DEFAULT = 'current_timestamp()' AND col.EXTRA = '', col.COLUMN_NAME, '') AS created_at,
                if(col.COLUMN_DEFAULT = 'current_timestamp()' AND col.EXTRA = 'on update current_timestamp()', col.COLUMN_NAME, '') AS updated_at,
                DATA_TYPE, 
                COLUMN_DEFAULT,
                col.EXTRA
            FROM information_schema.COLUMNS col
            WHERE 
            TABLE_NAME=:table
            GROUP BY COLUMN_NAME
            ORDER BY ORDINAL_POSITION
        `;

        const aColumn = (await dbMaster.raw(sql, {
            table:this.table
        }))[0];

        let ifSync = false;
        for (let i = 0; i < aColumn.length; i++) {
            const vColumn = aColumn[i];
            
            if( vColumn['created_at'] && this.columnSpecial.created_at != vColumn['created_at']){

                this.columnSpecial.created_at = vColumn['created_at'];
                ifSync = true;
            }

            if( vColumn['updated_at'] && this.columnSpecial.updated_at != vColumn['updated_at']){
                this.columnSpecial.updated_at = vColumn['updated_at'];
                ifSync = true;
            }

            if( vColumn['primary'] && this.columnSpecial.primary != vColumn['primary']){
                this.columnSpecial.primary = vColumn['primary'];
                ifSync = true;
            }
        }

        if(ifSync){
            await dbProxy('table').where('table', this.table).update({
                'col_primary':this.columnSpecial.primary,
                'col_created_at':this.columnSpecial.created_at,
                'col_updated_at':this.columnSpecial.updated_at
            });
        }
        
    }
}


/** Система очередей */
export class DbServerSys {
    
    private idSchema = 0;
    private idLog = 0; // id лога для вставки TODO переделать на отдельный инкрементор для балансировки
    private idQuery = 0; // Текущий максимальный id запроса TODO переделать на отдельный инкрементор для балансировки
    private bInit = false;
    private ixTable:Record<string, DbTableC> = {};
    private ixPrimaryKey:Record<string, string> = {}; // <table,columnkey>
    private ixAppInfoSync:Record<string, boolean> = {};

    // private runDb:boolean[] = [];

    private ixStatusError:Record<string,{
        text:string,
        time:number
    }> = {}

    private fSetErrorStatus(sKey:string,sText:string){
        this.ixStatusError[sKey] = {
            text:sText,
            time: new Date().valueOf()
        }
    }

    /** Получения данных по соединениям */
    public async status(msg:QueryContextI): Promise<QueryStatusI>{
        const iCurrTime = new Date().valueOf();
        const sDate = mFormatDate(iCurrTime);

        try {
            let bInsertInfo = false;
            if(!this.ixAppInfoSync[msg.ip+'_'+msg.app+'_'+sDate]){
                const resp = await dbProxy('info').where({
                    app_ip:msg.ip,
                    app_name:msg.app,
                    app_date:sDate,
                }).pluck('id');

                if(resp.length){
                    // Запись в кеш и очистка старого кеша за предыдущий день
                    this.ixAppInfoSync[msg.ip+'_'+msg.app+'_'+sDate] = true;
                    const sDatePrev = mFormatDate(dayjs().subtract(1, 'day'));
                    delete this.ixAppInfoSync[msg.ip+'_'+msg.app+'_'+sDatePrev];
                } else {
                    bInsertInfo = true; // Если записи нет требуется новая запись
                }
            }

            if(bInsertInfo){
                await dbProxy('info').insert({
                    app_ip:msg.ip,
                    app_name:msg.app,
                    app_date:sDate,
                    cnt_insert:msg.data?.cnt_insert || 0,
                    cnt_update:msg.data?.cnt_update || 0,
                    cnt_delete:msg.data?.cnt_delete || 0,
                    cnt_select:msg.data?.cnt_select || 0,
                    cnt_sync:msg.data?.cnt_sync,
                }).onConflict().merge({
                    cnt_insert:msg.data?.cnt_insert || 0,
                    cnt_update:msg.data?.cnt_update || 0,
                    cnt_delete:msg.data?.cnt_delete || 0,
                    cnt_select:msg.data?.cnt_select || 0,
                    cnt_sync:msg.data?.cnt_sync || 0
                });

                // Запись в кеш и очистка старого кеша за предыдущий день
                this.ixAppInfoSync[msg.ip+'_'+msg.app+'_'+sDate] = true;
                const sDatePrev = mFormatDate(dayjs().subtract(1, 'day'));
                delete this.ixAppInfoSync[msg.ip+'_'+msg.app+'_'+sDatePrev];
            } else { // Если запись существует
                await dbProxy('info').where({
                    app_ip:msg.ip,
                    app_name:msg.app,
                    app_date:sDate
                }).update({
                    cnt_insert:msg.data?.cnt_insert || 0,
                    cnt_update:msg.data?.cnt_update || 0,
                    cnt_delete:msg.data?.cnt_delete || 0,
                    cnt_select:msg.data?.cnt_select || 0,
                    cnt_sync:msg.data?.cnt_sync || 0,
                    updated_at:mFormatDateTime()
                });
            }
        } catch (e) {
            console.log('ERROR_SYNC_APP_INFO>>>', 'Ошибка синхронизации информации по приложению', e);
        }

        
        for (const k in this.ixStatusError) {
           
            const vStatusError = this.ixStatusError[k];
            if(vStatusError.time + (120*1000) < iCurrTime){
                delete this.ixStatusError[k];
            } else {
                msg.errors[k] = vStatusError.text;
            }
            
        }


        const adbConnect:string[] = [];
        const adbConnectWait:string[] = [];
        const adbConnectError:string[] = [];
        for (const i in adb) {
            const vConnect = adb[i].client.config.connection;
            adbConnect.push(vConnect.host+':'+vConnect.port+':'+vConnect.database);
        }
        for (const i in adbWait) {
            const vConnect = adbWait[i].client.config.connection;
            adbConnectWait.push(vConnect.host+':'+vConnect.port+':'+vConnect.database);
        }
        for (const i in adbError) {
            const vConnect = adbError[i].client.config.connection;
            adbConnectError.push(vConnect.host+':'+vConnect.port+':'+vConnect.database);
        }
        
        return {
            adb:adbConnect,
            adbWait:adbConnectWait,
            adbError:adbConnectError,
            adbCount:_.size(adb),
            adbWaitCount:_.size(adbWait),
            adbErrorCount:_.size(adbError)
        };
    }

    /** Получения данных по соединениям */
    public async connect(msg:QueryContextI){
        const sDate = mFormatDate();
        const adbRead = [];
        const adbAll = [];

        const cfDbRead = _.cloneDeep(conf.aCfDbRead[msg.ip as keyof typeof conf.aCfDbRead]);
        for (let i = 0; i < cfDbRead?.adb?.length; i++) {
            const db = cfDbRead.adb[i];
            db.connection.user = cfDbRead.user;
            db.connection.password = cfDbRead.password;
            adbRead.push(db);
        }

        const cfgReadFromAllIp = _.cloneDeep(conf.aCfDbRead['*' as keyof typeof conf.aCfDbRead]);
        for (let i = 0; i < cfgReadFromAllIp?.adb?.length; i++) {
            const db = cfgReadFromAllIp.adb[i];
            db.connection.user = cfgReadFromAllIp.user;
            db.connection.password = cfgReadFromAllIp.password;

            adbAll.push(db);
        }

        try {
            let bInsertInfo = false;
            if(!this.ixAppInfoSync[msg.ip+'_'+msg.app+'_'+sDate]){
                const resp = await dbProxy('info').where({
                    app_ip:msg.ip,
                    app_name:msg.app,
                    app_date:sDate,
                }).pluck('id');

                if(resp.length){
                    // Запись в кеш и очистка старого кеша за предыдущий день
                    this.ixAppInfoSync[msg.ip+'_'+msg.app+'_'+sDate] = true;
                    const sDatePrev = mFormatDate(dayjs().subtract(1, 'day'));
                    delete this.ixAppInfoSync[msg.ip+'_'+msg.app+'_'+sDatePrev];
                } else {
                    bInsertInfo = true; // Если записи нет требуется новая запись
                }
            }

            if(bInsertInfo){
                await dbProxy('info').insert({
                    app_ip:msg.ip,
                    app_name:msg.app,
                    app_date:sDate,
                    cnt_connect:1
                }).onConflict().ignore();

                // Запись в кеш и очистка старого кеша за предыдущий день
                this.ixAppInfoSync[msg.ip+'_'+msg.app+'_'+sDate] = true;
                const sDatePrev = mFormatDate(dayjs().subtract(1, 'day'));
                delete this.ixAppInfoSync[msg.ip+'_'+msg.app+'_'+sDatePrev];
            } else { // Если запись существует
                await dbProxy('info').where({
                    app_ip:msg.ip,
                    app_name:msg.app,
                    app_date:sDate
                }).update({
                    created_at:mFormatDateTime(),
                    cnt_connect:dbProxy.raw('cnt_connect + 1')
                });
            }
        } catch (e) {
            console.log('ERROR_CONNECT_APP_INFO>>>', 'Ошибка синхронизации информации по приложению', e);
        }

        const out = { 
            adb: adbRead,
            adbAll: adbAll,
            ixPrimaryKey:this.ixPrimaryKey
        }
        return out;
    }

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
        }))[0];

        this.idSchema = idSchema;
        vTableC.idSchema = idSchema;

        const aQuery = msg.query.split(';');

        for (let c = 0; c < aQuery.length; c++) {
            const sQuery = aQuery[c];

            let aPromiseQuery:Promise<Knex>[] = [];
            for (const i in adb) {
                const db = adb[i];

                aPromiseQuery.push(db.raw(sQuery))
                
            }

            await Promise.all(aPromiseQuery);
            aPromiseQuery = [];
        }

        try {
            await vTableC.faInit(msg.table); 
        } catch(e){
            console.log('ERROR schema>>> попытка синхрнизации с специальных колонок провалилась', conf.common.nameApp);
        }
        
        return {
            schema_id:idSchema,
            primary:vTableC.columnSpecial.primary
        };
    }

    /** Поместить значение в очередь */
    public async raw(msg:QueryContextI){

        if(!this.ixTable[msg.table]){
            this.ixTable[msg.table] = new DbTableC();
            await this.ixTable[msg.table].faInit(msg.table);
        }

        const vTableC = this.ixTable[msg.table];
        
        await this.fExeQuery(msg, msg.query);

        if(conf.option.replication){
            const sQueryStart = msg.query.substr(0, 50).toLowerCase().trim().replace(/`/g,'');
            if(sQueryStart.match(/^(insert)/)){
                vTableC.aQueryInsertLog.push(msg.query);
            } else if (sQueryStart.match(/^(update)/)){
                vTableC.aQueryUpdateLog.push(msg.query);
            } else if(sQueryStart.match(/^(delete)/)){
                vTableC.aQueryDeleteLog.push(msg.query);
            } else if(sQueryStart.match(/^(create table)|(drop table)|(truncate table)/)){
                const idSchema = (await dbProxy('schema').insert({
                    table:msg.table,
                    data:msg.query
                }))[0];
            } else {
                console.log('WARNING>>>Не удалось распознать команду')
            }
        }

        process.stdout.write('.')

    } 

    /** получить коннект для изменения данных update|delete */
    private async fGetIDForDataChange(msg:QueryContextI): Promise<number[]>{

        console.log('fGetIDForDataChange>>> msg.query', msg.table,msg.type, msg.query?.length);

        let aid = []
        let okExe = true;
        let vError = null; // Ошибка заполняется если при первом запросе она произошла
        const akDb = Object.keys(adb)
        const iRand = mRandomInteger(0, akDb.length - 1);
        try { // из случайной БД своего контура

            
            if(akDb.length > 0){

                const dbSelect = adb[akDb[iRand]];

                // const vConnect = dbSelect.client.config.connection;
                // console.log('SELECT RAND DB >>> '+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database);

                const a = (await dbSelect.raw(msg.query))[0];

                // console.log(msg.query);
                console.log('---1>',a)
                aid = a.map((el:any) => el[msg.key_in]);
                console.log('---2>',aid)
            } else {
                okExe = false;
                vError = new Error('ERROR>>> БД недоступна кол 0 - '+conf?.common?.nameApp+' БД доступные - '+adb?.length);
            }
        } catch (e) {
            console.log('ERROR>>> БД catch_log- '+conf?.common?.nameApp+' БД доступные - '+adb?.length, e);
            okExe = false
            vError = e;
        }

        if(!okExe && akDb?.length > 0){ // В случае ошибки, последовательно попытаться выполнить запрос из оставшихся БД своего контура
            console.log('SELECT ERROR - БД ALL:', ' БД по ALL',_.size(adb))
            for (const i in adb) {
                
                try {
                    const dbSelect = adb[i];
                    
                    const a = (await dbSelect.raw(msg.query))[0];

                    
                    console.log('---1>',a)
                    aid = a.map((el:any) => el[msg.key_in]);
                    console.log('---2>',aid)
    
                    console.log('SELECT ERROR - БД ALL: SUCCESS', i);
                    okExe = true;
                    break;
                } catch (e){
                    console.log('SELECT ERROR - БД ALL: FAIL', i, e);
                    okExe = false;
                }
            }
        }

        if(!okExe){ // Если так и не удалос выполнить запрос выбросить ошибку
            throw vError;
        }

        return aid
    }


    /** Выполнить запрос с обработкой ошибок */
    private async fExeQuery(msg:QueryContextI, sQuery:string){

        // console.log('---6> fExeQuery начало');

        if(!_.size(adb)){ // В случае если отключились все БД
            msg.errors['no_work_db'] = 'Нет доступных БД';
            throw new Error('no_work_db')
        }


        const iCntDbExe = _.size(adb);
        const asDbError:string[] = [];

        // console.log('SQL>>>',sQuery)

        const aPromiseQuery:Promise<Knex>[] = [];
        for (const i in adb) {
            const db = adb[i];
            aPromiseQuery.push(new Promise(async (resolve, reject) => {
                const iLocalNumDb = i;
                try {

                    const vConnect = db.client.config.connection;
                    // console.log('---8> fExeQuery IN DB START >>> '+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database);
                    
                    const out = await db.raw(sQuery)

                    // console.log('---9> fExeQuery IN DB END >>> '+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database);
                    resolve(out);

                } catch (e){
                    console.log('---9> fExeQuery IN DB END ERROR >>>','<<<',iLocalNumDb,'>>>', e);

                    const vConnect = adb[i].client.config.connection;
                    asDbError.push(vConnect.host+':'+vConnect.port+':'+vConnect.database);
                    // console.log('ERROR>>>', vConnect.host, vConnect.port, vConnect.database);
                    // msg.errors['leve_db'] = 'Отсоеденение проблемных БД';
                    // msg.errors['leve_db'+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database] = 'Отсоеденена проблемная БД - '+vConnect.host+':'+vConnect.port+':'+vConnect.database;
                    msg.errors['sql_error'] = String(e);
                    msg.errors['sql_error'+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database] = String(e);
                    
                    resolve(e);
                }
                
            }))
        }

        // console.log('---10> fExeQuery Before adbWait block wait count = ',_.size(adbWait));

        for (const i in adbWait) {
            const db = adbWait[i];
            aPromiseQuery.push(new Promise(async (resolve, reject) => {
                const iLocalNumDb = i;
                try {
                    
                    // console.log('---11> fExeQuery');
                    const out = await db.raw(sQuery)

                    const vConnect = adbWait[i].client.config.connection;
                    console.log('ПРОВЕРКА ВЫХОДА БД НА РАБОТУ')
                    console.log(ixDbWaitTime);
                    console.log(vConnect.host+':'+vConnect.port+':'+vConnect.database)
                    console.log(new Date().valueOf())
                    if(new Date().valueOf() - ixDbWaitTime[vConnect.host+':'+vConnect.port+':'+vConnect.database] > 2000){
                        console.log('>>>WAIT DB EXE', _.size(adbWait), _.size(adbError));
                        adb[iLocalNumDb] = adbWait[iLocalNumDb];
                        delete adbWait[iLocalNumDb];

                        
                        this.fSetErrorStatus('append_db', 'Присоеденена проблемных БД');
                        this.fSetErrorStatus(
                            'append_db'+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database, 
                            'Присоеденена проблемная БД - '+vConnect.host+':'+vConnect.port+':'+vConnect.database
                        );
                    
                    }
                    resolve(out);

                } catch (e){
                    
                    console.log('ERROR ВЫХОДА БД НА РАБОТУ>>>','<<<',iLocalNumDb,'>>>', e);
                    
                    const vConnect = adbWait[i].client.config.connection;
                    // console.log('ERROR>>>', vConnect.host, vConnect.port, vConnect.database);

                    adbError[iLocalNumDb] = adbWait[iLocalNumDb];
                    delete adbWait[iLocalNumDb];
                    resolve(e);
                }
                
            }))
        }
        try {

            // console.log('---12> fExeQuery паралельное начало выполнение запроса');
            await Promise.all(aPromiseQuery);
            // console.log('---13> fExeQuery паралельное окончание выполнение запроса');

            // Если ошибка произошла не на всех БД(а только на части) - соответственно проблема в БД - запускается механизм отделения БД
            if(asDbError.length && asDbError.length != iCntDbExe){

                // console.log('---14> fExeQuery что то пошло не так начало отсоединение БД');
                const ixErrorDb = _.keyBy(asDbError);
                for(const i in adb){
                    const db = adb[i];
                    const vConnect = db.client.config.connection;
                    const sDbConnect = vConnect.host+':'+vConnect.port+':'+vConnect.database;

                    if(ixErrorDb[sDbConnect]){
                        this.fSetErrorStatus('leve_db', 'Отсоеденение проблемных БД');
                        this.fSetErrorStatus(
                            'leve_db'+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database,
                            'Отсоеденена проблемная БД - '+vConnect.host+':'+vConnect.port+':'+vConnect.database

                        );
                        
                        adbError[i] = adb[i];
                        delete adb[i];
                    }
                }

            }
        } catch(e){
            console.log('количество ДБ в строю:',_.size(adb));
        }

        // Если ошибка произошла на всех БД - проблема не в базе а в запросе, потому генерится ошибка запроса
        if(asDbError.length && asDbError.length == iCntDbExe && msg.errors['sql_error']){
            // this.ctx.err
            throw new Error(msg.errors['sql_error']);
        }
        
    }
    
    /** Поместить значение в очередь */
    public async insert(msg:QueryContextI){
        if(!this.ixTable[msg.table]){
            this.ixTable[msg.table] = new DbTableC();
            await this.ixTable[msg.table].faInit(msg.table);
        }

        const vTableC = this.ixTable[msg.table];

        const sColCreatedAt = vTableC.columnSpecial.created_at;
        const sColUpdatedAt = vTableC.columnSpecial.updated_at;
        if(conf.option.replication && (sColCreatedAt || sColUpdatedAt)){
            for (let i = 0; i < msg.data.length; i++) {
                const vData = msg.data[i];
                
                if(sColCreatedAt && !vData[sColCreatedAt]){
                    vData[sColCreatedAt] = mFormatDateTime();
                }

                if(sColUpdatedAt && !vData[sColUpdatedAt]){
                    vData[sColUpdatedAt] = mFormatDateTime();
                }
            }
        }

        // Формирование запроса вставки
        let vQueryBuilder = gQuery(msg.table).insert(msg.data);
        if(msg?.option?.merge?.length){
            if(msg?.option?.merge[0] == '*'){
                vQueryBuilder.onConflict().merge()
            } else {
                vQueryBuilder.onConflict().merge(msg.option.merge)
            }
        }
        if(msg?.option?.mergeIgnore){
            vQueryBuilder.onConflict().ignore()
        }
        let sQuery = vQueryBuilder.toString()
        
        await this.fExeQuery(msg, sQuery);

        if(conf.option.replication){
            vTableC.aQueryInsertLog.push(vQueryBuilder.onConflict().merge().toString())
        }
        
        if(conf.option.log){
            await gDbLogSys.insert(msg);
        }

    }

    /** Поместить значение в очередь */
    public async replace(msg:QueryContextI){
        if(!this.ixTable[msg.table]){
            this.ixTable[msg.table] = new DbTableC();
            await this.ixTable[msg.table].faInit(msg.table);
        }

        const vTableC = this.ixTable[msg.table];

        const sColCreatedAt = vTableC.columnSpecial.created_at;
        const sColUpdatedAt = vTableC.columnSpecial.updated_at;
        if(conf.option.replication && (sColCreatedAt || sColUpdatedAt)){
            for (let i = 0; i < msg.data.length; i++) {
                const vData = msg.data[i];
                
                if(sColCreatedAt && !vData[sColCreatedAt]){
                    vData[sColCreatedAt] = mFormatDateTime();
                }

                if(sColUpdatedAt && !vData[sColUpdatedAt]){
                    vData[sColUpdatedAt] = mFormatDateTime();
                }
            }
        }

        const sQuery = gQuery(msg.table).insert(msg.data).toString()?.replace(/^insert/i, 'replace')
        
        await this.fExeQuery(msg, sQuery);

        if(conf.option.replication){
            vTableC.aQueryInsertLog.push(sQuery)
        }
        
        if(conf.option.log){
            await gDbLogSys.insert(msg);
        }


    }

    /** Получить количество сообщений в очереди */
    public async update(msg:QueryContextI){
        if(!this.ixTable[msg.table]){
            this.ixTable[msg.table] = new DbTableC();
            await this.ixTable[msg.table].faInit(msg.table);
        }

        const vTableC = this.ixTable[msg.table];

        const sColUpdatedAt = vTableC.columnSpecial.updated_at;
        // console.log('sColUpdatedAt>>>', sColUpdatedAt);
        if(conf.option.replication && sColUpdatedAt){
                
            if(!msg.data[sColUpdatedAt]){
                msg.data[sColUpdatedAt] = mFormatDateTime();
            }
        }

        const aid = await this.fGetIDForDataChange(msg);

        
        if(aid.length){
            if(msg?.option?.updateRaw){
                for (const kUpdate in msg?.option?.updateRaw) {
                    const sUpdate = msg?.option?.updateRaw[kUpdate];
                    
                    msg.data[kUpdate] = gQuery.raw(sUpdate);
                }
            }
            
            const vBuilderQuery = gQuery(msg.table).whereIn(msg.key_in, aid).update(msg.data);

            if(msg?.option?.merge?.length){
                if(msg?.option?.merge[0] == '*'){
                    vBuilderQuery.onConflict().merge(msg.option.merge)
                } else {
                    vBuilderQuery.onConflict().merge()
                }
            }
            if(msg?.option?.mergeIgnore){
                vBuilderQuery.onConflict().ignore()
            }

            const sQuery = vBuilderQuery.toString();

            await this.fExeQuery(msg, sQuery);

            if(conf.option.replication){
                vTableC.aQueryUpdateLog.push(vBuilderQuery.clone().onConflict().merge().toString())
            }

            if(conf.option.log){
                await gDbLogSys.update(aid, msg);
            }
        }

        return aid;
    }

    /** Получить количество сообщений в очереди */
    public async updateIn(msg:QueryContextI){
        if(!this.ixTable[msg.table]){
            this.ixTable[msg.table] = new DbTableC();
            await this.ixTable[msg.table].faInit(msg.table);
        }

        const vTableC = this.ixTable[msg.table];

        const sColUpdatedAt = vTableC.columnSpecial.updated_at;
        
        if(conf.option.replication && sColUpdatedAt){
                
            if(!msg.data[sColUpdatedAt]){
                msg.data[sColUpdatedAt] = mFormatDateTime();
            }
        }

        // console.log('---1>', msg.query);
        let aid = [];
        try { 
            aid = JSON.parse(msg.query) 
        } catch(e) {
            console.log('---ERROR>', 'Не удалось распарсить данные')
        };
        // console.log('---2>',aid)

        
        if(aid.length){
            let sQuery = '';

            if(msg?.option?.updateRaw){
                for (const kUpdate in msg?.option?.updateRaw) {
                    const sUpdate = msg?.option?.updateRaw[kUpdate];
                    
                    msg.data[kUpdate] = gQuery.raw(sUpdate);
                }
            }
            const vBuilderQuery = gQuery(msg.table).whereIn(msg.key_in, aid).update(msg.data)
            sQuery = vBuilderQuery.toString();

            await this.fExeQuery(msg, sQuery);

            if(conf.option.replication){
                vTableC.aQueryUpdateLog.push(vBuilderQuery.clone().onConflict().merge().toString())
            }

            if(conf.option.log){
                await gDbLogSys.update(aid,msg);
            }
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

        const aid = await this.fGetIDForDataChange(msg);

        if(aid.length){

            const sQuery = gQuery(msg.table).whereIn(msg.key_in, aid).delete().toString();

            await this.fExeQuery(msg, sQuery);

            if(conf.option.replication){
                vTableC.aQueryDeleteLog.push(sQuery)
            }
        }

        return aid;
    }

    /** Получить информацию по очереди */
    public async deleteIn(msg:QueryContextI): Promise<any>{

        if(!this.ixTable[msg.table]){
            this.ixTable[msg.table] = new DbTableC();
            await this.ixTable[msg.table].faInit(msg.table);
        }

        const vTableC = this.ixTable[msg.table];
  
        // console.log('---1>', msg.query);
        let aid = [];
        try { 
            aid = JSON.parse(msg.query) 
        } catch(e) {
            console.log('---ERROR>', 'Не удалось распарсить данные')
        };
        console.log('---2>',aid)

        if(aid.length){


            const sQuery = gQuery(msg.table).whereIn(msg.key_in, aid).delete().toString();

            await this.fExeQuery(msg, sQuery);

            if(conf.option.replication){
                vTableC.aQueryDeleteLog.push(sQuery)
            }
        }

        return aid;
    }

    /** Получить информацию по очереди */
    public async dbInit(){

        try {
            console.log('>>>ИНИЦИАЛИЗАЦИЯ PROXY_DB<<<')

            const bExistTable = await dbProxy.schema.hasTable('table');
            if(!bExistTable){
                console.log('>>>Проверка/Создание таблицы cfDbProxy.table')
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

                    table.string('col_primary', 100)
                        .comment('Первичный ключ');

                    table.string('col_created_at', 100)
                        .comment('колонка - дата создания строки');

                    table.string('col_updated_at', 100)
                        .comment('колонка - дата обновления строки');

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

            
            console.log('>>>Проверка/Создание таблицы cfDbProxy.schema')
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
            if(conf.option.replication){
                for(const i in adb){
                    const vDbReplication = adb[i];
                    console.log('>>>Проверка/Создание таблицы aCfDb.__replication__', vDbReplication.client.config.connection)
                    const bExistReplication = await vDbReplication.schema.hasTable('__replication__');
                    if(!bExistReplication){
                        await vDbReplication.schema.createTable('__replication__', (table:any) => {

                            table.bigIncrements('id')
                                .comment('ID');


                            table.integer('schema_id')
                                .index('schema_id')
                                .comment('Таблица');

                            table.enum('cmd',['insert', 'update', 'delete', 'schema'])
                                .index('cmd')
                                .comment('Таблица');


                            table.dateTime('created_at', null)
                                .notNullable()
                                .defaultTo(dbProxy.raw('CURRENT_TIMESTAMP'))
                                .comment('Время создания записи');
                                    
                            });
                    }
                }
            }
            
            console.log('>>>Проверка/Создание таблицы cfDbProxy.query')
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

                    table.text('data','mediumtext')
                        .comment('данные')
                        .collate('utf8mb4_bin');;

                    table.dateTime('created_at', null)
                        .index('created_at')
                        .notNullable()
                        .defaultTo(dbProxy.raw('CURRENT_TIMESTAMP'))
                        .comment('Время создания записи');

                });
            }

            console.log('>>>Проверка/Создание таблицы cfDbProxy.log_packet1')
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

            console.log('>>>Проверка/Создание таблицы cfDbProxy.log_packet2')
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
            this.idQuery = (await dbProxy('query').max({id:'id'}))[0]?.id || 0;


            // Фиксация проблемных БД
            let asErrorDB:string[] = [];
            if(conf.option.replication){
                for(const i in adb){
                    const db = adb[i];
                    const idQueryRep = (await db('__replication__').max({id:'id'}))[0]?.id || 0;

                    if(idQueryRep < this.idQuery){
                        const vConnect = adb[i].client.config.connection;   
                        asErrorDB.push(vConnect.host+':'+vConnect.port+':'+vConnect.database);
                    }

                    // this.runDb[i] = this.idQuery == idQueryRep;
                }

                // Отключение проблемных БД
                for (let i = 0; i < asErrorDB.length; i++) {
                    const sErrorDB = asErrorDB[i];
                    for(const j in adb){
                        const vConnect = adb[j].client.config.connection;
                        if(sErrorDB == vConnect.host+':'+vConnect.port+':'+vConnect.database){
                            adbError[j] = adb[j];
                            delete adb[j];
                            console.log(
                                '<<<ERROR_INIT Отсоеденена проблемная БД>>> - '+vConnect.host+':'+vConnect.port+':'+vConnect.database
                            );
                            break;
                        }
                    }
                }
            }

            console.log('>>>Проверка/Создание таблицы cfDbProxy.info')
            const bExistInfo = await dbProxy.schema.hasTable('info');
            if(!bExistInfo){
                await dbProxy.schema.createTable('info', (table:any) => {

                    table.increments('id')
                        .comment('ID');

                    table.string('app_ip', 20)
                        .comment('Таблица');

                    table.string('app_name', 100)
                        .comment('Таблица');

                    table.date('app_date')
                        .comment('Дата - День');

                    table.integer('cnt_connect')
                        .defaultTo(0)
                        .comment('Количество соединений');
                    
                    table.integer('cnt_sync')
                        .defaultTo(0)
                        .comment('Количество синхронизаций');

                    table.integer('cnt_insert')
                        .comment('Количество запросов на запись');

                    table.integer('cnt_update')
                        .comment('Количество запросов на обновление');

                    table.integer('cnt_delete')
                        .comment('Количество запросов на удаление');

                    table.integer('cnt_select')
                        .comment('Количество запросов на чтение');

                    table.dateTime('created_at')
                        .notNullable()
                        .defaultTo(dbProxy.raw('CURRENT_TIMESTAMP'))
                        .comment('Время создания записи');

                    table.dateTime('updated_at')
                        .notNullable()
                        .defaultTo(dbProxy.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
                        .comment('Время обновления записи');

                    table.unique(['app_ip', 'app_name', 'app_date'], { indexName:'app_ip_name_date'} )
                    table.comment('Таблица отслеживания активности приложений');

                });
            }

            console.log('>>>Синхронизация primary_key<<<');
            if(dbMaster.client.config.connection.database && conf.option.replication){
                const sqlPrimaryKey = `
                    SELECT GROUP_CONCAT(COLUMN_NAME) as COLUMN_NAME, TABLE_NAME
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                    WHERE
                    TABLE_SCHEMA = '${dbMaster.client.config.connection.database}'
                    AND CONSTRAINT_NAME='PRIMARY'
                    GROUP BY TABLE_NAME;
                `;

                const aPrimaryKey:{COLUMN_NAME:string, TABLE_NAME:string}[] = (await dbMaster.raw(sqlPrimaryKey))[0];
                const ixPrimaryKey = _.keyBy(aPrimaryKey, 'TABLE_NAME');

                const aProxyPrimaryKey:{col_primary:string, table:string}[] = await dbProxy('table').select('col_primary', 'table');
                const ixProxyPrimaryKey = _.keyBy(aProxyPrimaryKey, 'table');

                for (const kTable in ixPrimaryKey) {
                    if(kTable == '__replication__') continue; // игнорируем тех таблицу репликации

                    const vRowMaster = ixPrimaryKey[kTable]
                    const vRowProxy = ixProxyPrimaryKey[kTable];
                    const ifSingleKey = vRowMaster.COLUMN_NAME?.split(',')?.length == 1;
                    if(ifSingleKey){
                        this.ixPrimaryKey[kTable] = vRowMaster.COLUMN_NAME;
                    }

                    if(vRowProxy && vRowProxy.col_primary != vRowMaster.COLUMN_NAME && ifSingleKey){
                        await dbProxy('table').where('table', kTable).update({
                            col_primary:vRowMaster.COLUMN_NAME
                        });
                        
                    } else if(!vRowProxy && ifSingleKey){
                        await dbProxy('table').insert({
                            table:kTable,
                            col_primary:vRowMaster['COLUMN_NAME']
                        }).onConflict().merge(['col_primary']);
                    } else {
                        if(!ifSingleKey){
                            console.log('>>>ERROR>>> Пропущен мультиключь при синхронизации primary:',vRowMaster.COLUMN_NAME)
                        }
                    }
                }
            }
            
            console.log('this.idSchema',this.idSchema);

            this.bInit = true;

            console.log('>>>ИНИЦИАЛИЗАЦИЯ ЗАВЕРШЕНА<<<')
        } catch (e) {
            console.log(e);
            console.log('>>>ОШИБКА ПРИ ИНИЦИАЛИЗАЦИИ<<<')
            process.exit(1); // завершить программу
        }
        
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
                    id:++this.idQuery,
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
                    id:++this.idQuery,
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
                    id:++this.idQuery,
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

        if(aDbLog.length && conf.option.replication){

            let aPacket:any[] = [];
            for (let i = 0; i < aDbLog.length; i++) {
                const vDbLog = aDbLog[i];
                
                aPacket.push({
                    id:vDbLog.id,
                    schema_id:vDbLog.schema_id,
                    cmd:vDbLog.cmd,
                })
            }

            const aPromiseQuery:Promise<any>[] = [];
            for(const i in adb){
                const db = adb[i];

                aPromiseQuery.push(db('__replication__').insert(aPacket).onConflict().merge());
            }
            await Promise.all(aPromiseQuery);
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

    
}