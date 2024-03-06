
import { QuerySys } from "@a-a-game-studio/aa-front";

import { v4 as uuidv4 } from 'uuid';

import ip from 'ip'
import { QueryContextI, MsgT, QueryStatusI } from "../interface/CommonI";

import knex, { Knex } from "knex";
import _ from "lodash";
import { mRandomInteger } from "../Helper/NumberH";
import { mWait } from "../Helper/WaitH";




let adb:Record<string, Knex> = {};
let adbError:Record<string, Knex> = {};

let adbAll:Record<string, Knex> = {};
let adbAllError:Record<string, Knex> = {};

let adbAllClaster:Record<string, Knex> = {};

/** Обработка ошибок отключения/присоединения БД */
function workErrorDb(errors:Record<string,string>){
    try {
        console.log(
            '>>>workErrorDb.STATUS_START:', 
            ' БД по IP',Object.keys(adb)?.length,'|',Object.keys(adbError)?.length, 
            ' БД доступные',Object.keys(adbAll)?.length,'|',Object.keys(adbAllError)?.length
        )
        if(errors['leve_db']){
            for (const i in adb) {
                const vConnect = adb[i].client.config.connection;
                // console.log('ERROR>>>', vConnect.host, vConnect.port, vConnect.database);
                
                if(errors['leve_db'+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database]){

                    // // Если одновременно и добавление и удаление
                    // if(errors['append_db'+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database]){
                    //     // delete errors['leve_db'+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database];
                    //     // delete errors['append_db'+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database];
                    //     continue;
                    // }
                    if(adb[i]){
                        adbError[i] = adb[i];
                    }
                    delete adb[i];
                    console.log('Отключение проблемной БД IP')
                }
            }
            for (const i in adbAll) {
                const vConnect = adbAll[i].client.config.connection;
                // console.log('ERROR>>>', vConnect.host, vConnect.port, vConnect.database);
                
                if(errors['leve_db'+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database]){

                    // // Если одновременно и добавление и удаление
                    // if(errors['append_db'+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database]){
                    //     // delete errors['leve_db'+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database];
                    //     // delete errors['append_db'+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database];
                    //     continue;
                    // }
                    if(adbAll[i]){
                        adbAllError[i] = adbAll[i];
                    }
                    delete adbAll[i];
                    console.log('Отключение проблемной БД All')
                }
            }
        }

        if(errors['append_db']){
            for (const i in adbError) {
            // for (let i = 0; i < adbError.length; i++) {
                const vConnect = adbError[i].client.config.connection;
                if(errors['append_db'+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database]){
                    if(adbError[i]){
                        adb[i] = adbError[i];
                    }
                    delete adbError[i];

                    console.log('Добавление проблемной БД IP')
                }
                
            }

            for (const i in adbAllError) {
            // for (let i = 0; i < adbAllError.length; i++) {
                const vConnect = adbAllError[i].client.config.connection;
                if(errors['append_db'+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database]){
                    if(adbAllError[i]){
                        adbAll[i] = adbAllError[i];
                    }
                    delete adbAllError[i];

                    console.log('Добавление проблемной БД ALL')
                }

            }
        }
    } catch(e) {
        console.log('ProxyDb.workErrorDb>>>',e);
    }

    console.log(
        '>>>workErrorDb.STATUS_END:', 
        ' БД по IP',Object.keys(adb)?.length,'|',Object.keys(adbError)?.length, 
        ' БД доступные',Object.keys(adbAll)?.length,'|',Object.keys(adbAllError)?.length
    )
}

/** DbClientSys */
export class DbClientSys {

    conf:{
        baseURL: string, // 'ws://127.0.0.1:8080',
        nameApp: string, // Наименование приложения
    } = null;


    

   

    private querySys:QuerySys = null;
    iSend:number = 0;
    iSendComplete:number = 0;
    iSendErr:number = 0;

    bInitDbProcess = false;
    bInitDbConnect = false;

    private iSelect = 0;
    private iInsert = 0;
    private iUpdate = 0;
    private iDelete = 0;
    private iReplace = 0;
    

    // Работа с буфером
    iLastTimeSend = Date.now();
    ixSendBuffer:Record<string, QueryContextI[]> = {};
    iSendBufferCount = 0;

    // Установка количество рабочик в воркере
    // iWorkerMax = 0;
    // iWorker = 0;
    ixWorker:Record<string, {
        max?:number;
        count?:number;
        interval?:any;
    }> = {}

    intervalDbStatus:any = null; // интервал для проверки статуса БД


    /** init */
    constructor(conf:{
        baseURL: string, // 'ws://127.0.0.1:8080',
        nameApp: string, // Наименование приложения
    }){
        this.querySys = new QuerySys()
        this.querySys.fConfigWs(conf);
        this.conf = conf;

        if(!Object.keys(adb).length){
            // Соединение
            const vMsg:QueryContextI = {
                uid:uuidv4(),
                app:this.conf.nameApp,
                table:'',
                ip:ip.address(),
                type:MsgT.connect,
                time:Date.now()
            }

            this.querySys.fInit();
            this.querySys.fActionOk((data: any) => {

                console.log('data.adb>>>',data.adb);
                console.log('data.adbAll>>>',data.adbAll);
                if(Object.keys(data.adb).length){
                    for (let [k,db] of Object.entries(data.adb)) {

                        adb[k] = knex(db);
                    }

                } else if(Object.keys(data.adbAll).length){
                    for (let [k,db] of Object.entries(data.adbAll)) {
                        
                        //adb.push(knex(db))
                        adb[k] = knex(db);
                    }
                }

                if(Object.keys(data.adbAll).length){
                    for (let [k,db] of Object.entries(data.adbAll)) {
                        
                        adbAll[k] = knex(db);
                        adbAllClaster[k] = knex(db);
                        // adbAll.push(knex(db))
                        // adbAllClaster.push(knex(db))
                    }
                }

                

                if(Object.keys(adb).length){
                    this.bInitDbConnect = true;

                    console.log('Соединение на чтение успешно установленно');
                } else {
                    console.log('Соединения на чтение отсутствуют');
                }
            });   

            this.querySys.fActionErr((err:any) => {
                this.iSendErr++;
                console.error('ERROR>>>',err);
                this.bInitDbConnect = false;
            });
            this.querySys.fSend(MsgT.connect, vMsg);
        }


        /** Интервал записи данных в бд */
        this.intervalDbStatus = setInterval(async () => {
            this.status();
        },60*1000)

    }

    /** Заполнить инкрементный ID */
    public status():any{
       
        return new Promise((resolve, reject) => {

            this.querySys.fInit();

            // ==============

            const vMsg:QueryContextI = {
                uid:uuidv4(),
                app:this.conf.nameApp,
                ip:ip.address(),
                table:null,
                type:MsgT.status,
                data:null,
                time:Date.now()
            }

            this.querySys.fAction((ok:boolean, data:Record<string,string>,resp:QueryStatusI) => {

                // abp:adbConnect,
                // adbWait:adbConnectWait,
                // adbError:adbConnectError,
                // adbCount:adb.length,
                // adbWaitCount:adbWait.length,
                // adbErrorCount:adbError.length

                // console.log('STATUS>>>', ' ok:',ok,' data:',data,' resp:',resp);
                console.log('STATUS>>>', data);

                if(data?.adb?.length){
                    for (let i = 0; i < data.adb.length; i++) {
                        const sDbConnect = data.adb[i];
                        if(!adb[sDbConnect] && adbError[sDbConnect]){
                            resp.errors['append_db'] = 'Присоединение БД через STATUS';
                            resp.errors['append_db'+':'+sDbConnect];
                        }
                    }
                }
                if(data?.adbError?.length){
                    for (let i = 0; i < data.adbError.length; i++) {
                        const sDbConnect = data.adbError[i];
                        if(adb[sDbConnect] && !adbError[sDbConnect]){
                            resp.errors['leve_db'] = 'Отсоединение БД через STATUS';
                            resp.errors['leve_db'+':'+sDbConnect];
                        }
                    }
                }
                
                if(_.size(resp.errors)){
                    workErrorDb(resp.errors);
                }

                resolve(resp)
                
            });

            this.querySys.fSend(MsgT.status, vMsg);
            this.iSend++;
        })
        
    }

    /** Заполнить инкрементный ID */
    public connect(){
        return new Promise((resolve, reject) => {

        })
    }


    /** Заполнить инкрементный ID */
    public fillID(sTable:string, aRowsIn:any[]):any{
       
        return new Promise((resolve, reject) => {

            this.querySys.fInit();

            let aRows = aRowsIn;

            let cntID = 0;
            
            
            if(aRows.length){
                for (let i = 0; i < aRows.length; i++) {
                    const vRow = aRows[i];

                    if(!vRow.id){
                        
                        cntID++;
                    }
                }
            }

            // ==============

            const vMsg:QueryContextI = {
                uid:uuidv4(),
                app:this.conf.nameApp,
                ip:ip.address(),
                table:sTable,
                type:MsgT.id,
                data:{cnt:cntID},
                time:Date.now()
            }

            
            this.querySys.fActionOk((data: any) => {

                // console.log('[id_in]:',data,aRows);
                this.iSendComplete++;


                // ==============
                let iFillID = 0;
                if(data.length){
                    for (let i = 0; i < aRows.length; i++) {
                        const vRows = aRows[i];

                        if(!vRows.id){
                            
                            vRows.id = data[iFillID];
                            iFillID++;
                        }
                    }
                }

                // console.log('[id_fill]:',aRows);

                resolve(aRows)

            });
            this.querySys.fActionErr((err:any) => {
                this.iSendErr++;
                console.error(err);
                reject(err)
            });
            this.querySys.fSend(MsgT.id, vMsg);
            this.iSend++;
        })
        
    }

    /** Заполнить инкрементный ID */
    public fillUID(data:any|any[]){
        if(data.length){
            for (let i = 0; i < data.length; i++) {
                const vRow = data[i];

                if(!vRow.uid){
                    
                    vRow.uid = uuidv4();
                }
            }
        } else {
            if(!data.uid){
                data.uid = uuidv4();
            }
        }
    }

    /** Схема */
    public schema(table:string, query:Knex.SchemaBuilder){
        return new Promise((resolve, reject) => {

            // Парсинг запроса
            const sql = query.toQuery();

            const sQueryStart = sql.substr(0, 100).toLowerCase().trim().replace(/`/g,'');

            console.log(sQueryStart);

            const aMatch = sQueryStart.match(/^(alter)|(create)|(drop)|(truncate)/);

            if(!aMatch){
                reject(new Error(
                    'Запрос не корректный, не подходит под правило - \n' + 
                    '/^(alter)|(create)|(drop)|(truncate)/'
                ))
            }

            
            this.querySys.fInit();

            const vMsg:QueryContextI = {
                uid:uuidv4(),
                app:this.conf.nameApp,
                ip:ip.address(),
                table:table,
                type:MsgT.schema,
                query:query.toString(),
                time:Date.now()
            }

            this.querySys.fActionOk((data: any) => {

                console.log('[id_in]:',data);
                // this.iSendComplete++;
                resolve(data)
            });
            this.querySys.fActionErr((err:any) => {
                this.iSendErr++;
                console.error(err);
                reject(err)
            });
            this.querySys.fSend(MsgT.schema, vMsg);
            this.iSelect++;
        });
    }

    /** Общие запросы другой категории */
    public common(query:Knex.QueryBuilder){
        return new Promise((resolve, reject) => {

            // Парсинг запроса
            const sql = query.toQuery();

            const sQueryStart = sql.substr(0, 100).toLowerCase().trim().replace(/`/g,'');

            console.log(sQueryStart);

            const aMatch = sQueryStart.match(/^(select)|(insert)|(update)|(delete)|(alter)|(create)|(drop)|(truncate)/);

            if(aMatch){
                reject(new Error(
                    'Запрос не корректный, подходит под правило - только общие запросы - \n' + 
                    '/^(select)|(insert)|(update)|(delete)|(alter)|(create)|(drop)|(truncate)/'
                ))
            }
            
            this.querySys.fInit();

            const vMsg:QueryContextI = {
                uid:uuidv4(),
                app:this.conf.nameApp,
                ip:ip.address(),
                table:'',
                type:MsgT.common,
                query:query.toString(),
                time:Date.now()
            }

            this.querySys.fActionOk((data: any) => {
                resolve(data)
            });
            this.querySys.fActionErr((err:any) => {
                this.iSendErr++;
                console.error(err);
                reject(err)
            });
            this.querySys.fAction((ok:boolean, err:Record<string,string>,resp:any) => {
                if(_.size(resp.errors)){
                    workErrorDb(resp.errors);
                }
            });
            this.querySys.fSend(MsgT.common, vMsg);
            this.iSelect++;
        });
    }

    /** SELECT */
    public async select<T = any>(query:Knex.QueryBuilder|Knex.Raw): Promise<T> {

        const builder = <any>query;
        
        // Парсинг запроса
        const sql = query.toQuery();

        const sQueryStart = sql.substr(0, 100).toLowerCase().trim().replace(/`/g,'');

        console.log(sQueryStart);

        const aMatch = sQueryStart.match(/^select/);

        if(!aMatch){
            throw (new Error(
                'Запрос не корректный, не подходит под правило - \n' + 
                '/^select/'
            ))
        }

        if(!this.bInitDbConnect){
            while(!this.bInitDbConnect){
                console.log('Пытаемся соединится с БД для чтения')
                await mWait(1000);
            }
        }

        // Случайно отдаем одну базу данных из пула
        
        

        // console.log('>>>SELECT:', ' БД по IP',adb.length, ' БД доступные',adbAll.length)
        
        let out:T = null;
        let okExe = true;
        let vError = null; // Ошибка заполняется если при первом запросе она произошла

        const akAdb = Object.keys(adb);
        
        try { // из случайной БД своего контура

            if(akAdb?.length > 0){
                const iRand = akAdb[mRandomInteger(0, akAdb.length - 1)]
                const dbSelect = adb[iRand];
                builder.client = dbSelect.client;

                // const vConnect = dbSelect.client.config.connection;
                // console.log('SELECT RANDOM DB >>> '+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database);

                // Выполнить запрос
                if (builder._method){ // _method только у билдера
                    out = await builder
                } else {
                    out = (await builder)[0]
                }
            } else {
                okExe = false;
                vError = new Error('БД недоступна - '+this.conf?.nameApp+' - БД по IP'+adb?.length+' БД доступные - '+adbAll?.length);
            }
        } catch (e) {
            console.log('БД недоступна - '+this.conf?.nameApp+' - БД по IP'+adb?.length+' БД доступные - '+adbAll?.length);
            okExe = false
            vError = e;
        }

        const akAdbAll = Object.keys(adbAll);
        if(!okExe && akAdb?.length > 0){ // В случае ошибки, последовательно попытаться выполнить запрос из оставшихся БД своего контура
            console.log('SELECT ERROR - БД IP:', ' БД по IP',akAdb.length, ' БД доступные',akAdbAll.length)
            for (const i in adb) {
                const dbSelect = adb[i];

                const vConnect = dbSelect.client.config.connection;
                console.log('SELECT IP [',i,'] DB >>> '+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database);
                
                try {
                    builder.client = dbSelect.client
                    // console.log('SELECT ERROR SELECT QUERY', dbSelect.client.config.connection)
                    // Выполнить запрос
                    if (builder._method){ // _method только у билдера
                        out = await builder
                    } else {
                        out = (await builder)[0]
                    }
    
                    console.log('SELECT ERROR - БД IP: SUCCESS', i);
                    okExe = true;
                    break;
                } catch (e){
                    console.log('SELECT ERROR - БД IP: FAIL', i, e);
                    okExe = false;
                }
            }
        }

        if(!okExe && akAdbAll?.length > 0){ // В случае ошибки, последовательно попытаться выполнить запрос из оставшихся БД доступных приложению
            console.log('SELECT ERROR - БД БД ALL:', ' БД по IP',akAdb.length, ' БД доступные',akAdbAll.length)
            for (const i in adbAll) {
                const dbSelect = adbAll[i];
                
                try {
                    builder.client = dbSelect.client

                    const vConnect = dbSelect.client.config.connection;
                    console.log('SELECT ALL [',i,'] DB >>> '+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database);
                    
                    // console.log('SELECT ERROR SELECT QUERY', dbSelect.client.config.connection)
                    // Выполнить запрос
                    if (builder._method){ // _method только у билдера
                        out = await builder
                    } else {
                        out = (await builder)[0]
                    }
    
                    console.log('SELECT ERROR - БД ALL: SUCCESS ', i)
                    okExe = true;
                    break;
                } catch (e){
                    console.log('SELECT ERROR - БД ALL: FAIL ', i, e)
                    okExe = false;
                }
            }
        }

        const akAdbAllClaster = Object.keys(adbAllClaster);
        if(!okExe && akAdbAllClaster?.length > 0){ // В случае ошибки, последовательно попытаться выполнить запрос из оставшихся БД доступных приложению
            console.log('SELECT ERROR - БД ALL CLUSTER:', ' БД по IP',akAdb.length, ' БД доступные',akAdbAll.length)
            for (const i in adbAllClaster) {
                const dbSelect = adbAllClaster[i];
                
                try {
                    builder.client = dbSelect.client
                    // console.log('SELECT ERROR SELECT QUERY', dbSelect.client.config.connection)
                    // Выполнить запрос
                    if (builder._method){ // _method только у билдера
                        out = await builder
                    } else {
                        out = (await builder)[0]
                    }
    
                    console.log('SELECT ERROR - БД ALL CLUSTER: SUCCESS ', i)
                    okExe = true;
                    break;
                } catch (e){
                    console.log('SELECT ERROR - БД ALL CLUSTER: FAIL ', i, e)
                    okExe = false;
                }
            }
        }

        

        if(!okExe){ // Если так и не удалос выполнить запрос выбросить ошибку
            throw vError;
        }
        

        this.iSelect++;

        return out ;    
        
    }

    /** INSERT */
    public async insert(table:string, dataIn:any|any[],onConflict?:'ignore'|'merge'){
        const aDatePrepare = dataIn.length ? dataIn : [dataIn];
        await this.fillID(table, aDatePrepare)

        return new Promise((resolve, reject) => {

            this.querySys.fInit();

            const vMsg:QueryContextI = {
                uid:uuidv4(),
                app:this.conf.nameApp,
                ip:ip.address(),
                table:table,
                type:MsgT.insert,
                data:aDatePrepare,
                time:Date.now()
            }

            this.querySys.fActionOk((dataOut: any) => {
                if(dataOut){
                    console.log('insert end', dataOut)
                }
                resolve(dataIn)
            });
            this.querySys.fActionErr((err:any) => {
                console.error('ERROR INSERT CLIENT>>>', err);
                reject(err)
            });
            this.querySys.fAction((ok:boolean, err:Record<string,string>,resp:any) => {
                if(_.size(resp.errors)){
                    workErrorDb(resp.errors);
                }
            });
            this.querySys.fSend(MsgT.insert, vMsg);
            this.iInsert++;

            console.log('insert init')
        });
    }

    /** REPLCAE by primary key */
    public async replace(table:string, dataIn:any|any[]){
        const aDatePrepare = dataIn.length ? dataIn : [dataIn];

        return new Promise((resolve, reject) => {

            this.querySys.fInit();

            const vMsg:QueryContextI = {
                uid:uuidv4(),
                app:this.conf.nameApp,
                ip:ip.address(),
                table:table,
                type:MsgT.replace,
                data:aDatePrepare,
                time:Date.now()
            }

            this.querySys.fActionOk((dataOut: any) => {
                if(dataOut){
                    console.log('replace end', dataOut)
                }
                resolve(dataIn)
            });
            this.querySys.fActionErr((err:any) => {
                console.error('ERROR REPLACE CLIENT>>>', err);
                reject(err)
            });
            this.querySys.fAction((ok:boolean, err:Record<string,string>,resp:any) => {
                if(_.size(resp.errors)){
                    workErrorDb(resp.errors);
                }
            });
            this.querySys.fSend(MsgT.replace, vMsg);
            this.iInsert++;

            console.log('replace init')
        });
    }

    /** UPDATE IN
     * updateIn('item.item_id', [22,33], {name:'new_name'})
     */
    public updateIn(sTableKey:string, whereIn:number[]|string[], dataIn:any){
        return new Promise((resolve, reject) => {

            const asTableKey = sTableKey.split('.');
            const sTable = asTableKey[0];
            const sWhereKey =  asTableKey[1] || 'id';

            console.log(whereIn);

            if(!sTable && !sWhereKey && whereIn.length !== 0){
                reject(new Error(
                    'Запрос не корректный updateIn, не подходит под правило - \n' + sTable +'.'+sWhereKey
                ))
            }

            let sQuery = '[]';
            try {
                sQuery = JSON.stringify(whereIn);
            } catch (e){
                reject(new Error(
                    'Не удалось данные провести серелизацию'
                ))
            }

            this.querySys.fInit();

            const vMsg:QueryContextI = {
                uid:uuidv4(),
                app:this.conf.nameApp,
                ip:ip.address(),
                table:sTable,
                type:MsgT.update_in,
                key_in:sWhereKey,
                query: sQuery,
                data:dataIn,
                time:Date.now()
            }

            this.querySys.fActionOk((dataOut: any) => {

                console.log('[update]:',dataOut);
                // this.iSendComplete++;
                resolve(dataOut)
            });
            this.querySys.fActionErr((err:any) => {
                this.iSendErr++;
                console.error(err);
                reject(err)
            });

            this.querySys.fAction((ok:boolean, err:Record<string,string>,resp:any) => {
                if(_.size(resp.errors)){
                    workErrorDb(resp.errors);
                }
            });

            this.querySys.fSend(MsgT.update_in, vMsg);
            this.iUpdate++;
        });
    }

    /** UPDATE */
    public update(dataIn:any, query:Knex.QueryBuilder|Knex.Raw){
        return new Promise((resolve, reject) => {

            // Парсинг запроса
            const sql = query.toQuery();

            const sQueryStart = sql.substr(0, 100).toLowerCase().trim().replace(/`/g,'');

            console.log(sQueryStart);

            const aMatch = sQueryStart.match(/^select\s+([a-z0-9_-]+)\s+as?\s+([a-z0-9_-]+)\s+from\s+([a-z0-9_-]+)\s+where/);

            let sSqlNew = ''
            let sWhereKey = ''
            let sTable = ''

            console.log(aMatch);

            // Проверка синтаксиса
            if(aMatch){
                const aQueryStartNew = [];
                aQueryStartNew.push(...['select', aMatch[1], 'as', aMatch[2], 'from', aMatch[3], ' '])

                const iWhere = sql.indexOf('where');

                // результат парсинга
                sSqlNew = aQueryStartNew.join(' ') + sql.substr(iWhere)
                sWhereKey = aMatch[2];
                sTable = aMatch[3];
                
            } else {
                reject(new Error(
                    'Запрос не корректный, не подходит под правило - \n' + 
                    '/^select\s+([a-z0-9_-]+)\s+as?\s+([a-z0-9_-]+)\s+from\s+([a-z0-9_-]+)\s+where/'
                ))
            }

            this.querySys.fInit();

            const vMsg:QueryContextI = {
                uid:uuidv4(),
                app:this.conf.nameApp,
                ip:ip.address(),
                table:sTable,
                type:MsgT.update,
                key_in:sWhereKey,
                query:sSqlNew,
                data:dataIn,
                time:Date.now()
            }

            this.querySys.fActionOk((dataOut: any) => {

                console.log('[update]:',dataOut);
                // this.iSendComplete++;
                resolve(dataOut)
            });
            this.querySys.fActionErr((err:any) => {
                this.iSendErr++;
                console.error(err);
                reject(err)
            });

            this.querySys.fAction((ok:boolean, err:Record<string,string>,resp:any) => {
                if(_.size(resp.errors)){
                    workErrorDb(resp.errors);
                }
            });

            this.querySys.fSend(MsgT.update, vMsg);
            this.iUpdate++;
        });
    }

    /** 
     * UPDATE
     * Пример select it.id as id from item as i left join item_ex ie ON ie.item_id = i.id where  id > 0
     */
    public updateJoin(dataIn:any, query:Knex.QueryBuilder|Knex.Raw){
        return new Promise((resolve, reject) => {

            // Парсинг запроса
            const sql = query.toQuery();

            const sQueryStart = sql.substr(0, 100).toLowerCase().trim().replace(/`/g,'');

            console.log(sQueryStart);

            const aMatch = sQueryStart.match(/^select\s+([a-z0-9_-]\.[a-z0-9_-]+)\s+as?\s+([a-z0-9_-]+)\s+from\s+([a-z0-9_-]+)\s+as\s+([a-z0-9_-]+)\s+(\bleft join\b|\bjoin\b|\bright join\b)/);

            let sSqlNew = ''
            let sWhereKey = ''
            let sTable = ''

            console.log('updateJoin:', aMatch);

            // Проверка синтаксиса
            if(aMatch){
                const aQueryStartNew = [];
                aQueryStartNew.push(...['select', aMatch[1], 'as', aMatch[2], 'from', aMatch[3], aMatch[4]], ' ')
                

                const sQueryStartRaw = sql.slice(0,100).toLowerCase()
                const iJoin = sQueryStartRaw.indexOf(' join ');
                const iLeft = sQueryStartRaw.indexOf(' left join ');
                const iRight = sQueryStartRaw.indexOf(' right join ');
                let iJoinPos = 0;
                iJoinPos = iJoin > iJoinPos ? iJoin : iJoinPos;
                iJoinPos = iLeft > 0 && iLeft < iJoinPos ? iLeft : iJoinPos;
                iJoinPos = iRight > 0 && iRight < iJoinPos ? iRight : iJoinPos;

                // результат парсинга
                sSqlNew = aQueryStartNew.join(' ') + sql.substr(iJoinPos)
                sWhereKey = aMatch[2];
                sTable = aMatch[3];

                console.log('>>>','key_id:',[sWhereKey], 'table_update:',[sTable] , '>>>',sSqlNew, );
                
            } else {
                reject(new Error(
                    'Запрос не корректный, не подходит под правило' +
                    '/^select\s+([a-z0-9_-]\.[a-z0-9_-]+)\s+as?\s+([a-z0-9_-]+)\s+from\s+([a-z0-9_-]+)\s+as\s+([a-z0-9_-]+)\s+(\bleft join\b|\bjoin\b|\bright join\b)/'
                ))
            }

            this.querySys.fInit();

            const vMsg:QueryContextI = {
                uid:uuidv4(),
                app:this.conf.nameApp,
                ip:ip.address(),
                table:sTable,
                type:MsgT.update,
                key_in:sWhereKey,
                query:sSqlNew,
                data:dataIn,
                time:Date.now()
            }

            this.querySys.fActionOk((dataOut: any) => {

                console.log('[update_join]:',dataOut);
                // this.iSendComplete++;
                resolve(dataOut)
            });
            this.querySys.fActionErr((err:any) => {
                this.iSendErr++;
                console.error(err);
                reject(err)
            });
            this.querySys.fAction((ok:boolean, err:Record<string,string>,resp:any) => {
                if(_.size(resp.errors)){
                    workErrorDb(resp.errors);
                }
            });
            this.querySys.fSend(MsgT.update, vMsg);
            this.iUpdate++;
        });
    }

    /** DELETE */
    public delete(query:Knex.QueryBuilder|Knex.Raw) {
        return new Promise((resolve, reject) => {

            // Парсинг запроса
            const sql = query.toQuery();

            const sQueryStart = sql.substr(0, 100).toLowerCase().trim().replace(/`/g,'');

            const aMatch = sQueryStart.match(/^select\s+([a-z0-9_-]+)\s+as?\s+([a-z0-9_-]+)\s+from\s+([a-z0-9_-]+)\s+where/);

            let sSqlNew = ''
            let sWhereKey = ''
            let sTable = ''

            // Проверка синтаксиса
            if(aMatch){
                const aQueryStartNew = [];
                aQueryStartNew.push(...['select', aMatch[1], 'as', aMatch[2], 'from', aMatch[3], ' '])

                const iWhere = sql.indexOf('where');

                // результат парсинга
                sSqlNew = aQueryStartNew.join(' ') + sql.substr(iWhere)
                sWhereKey = aMatch[2];
                sTable = aMatch[3];
                
            } else {
                reject(new Error(
                    'Запрос не корректный, не подходит под правило - \n' + 
                    '/^select\s+([a-z0-9_-]+)\s+as?\s+([a-z0-9_-]+)\s+from\s+([a-z0-9_-]+)\s+where/'
                ))
            }

            this.querySys.fInit();

            const vMsg:QueryContextI = {
                uid:uuidv4(),
                app:this.conf.nameApp,
                ip:ip.address(),
                table:sTable,
                key_in:sWhereKey,
                type:MsgT.delete,
                query:query.toString(),
                time:Date.now()
            }

            this.querySys.fActionOk((dataOut: any) => {

                console.log('[dataOut]:',dataOut);
                // this.iSendComplete++;
                resolve(dataOut)
            });
            this.querySys.fActionErr((err:any) => {
                this.iSendErr++;
                console.error(err);
                reject(err)
            });

            this.querySys.fAction((ok:boolean, err:Record<string,string>,resp:any) => {
                if(_.size(resp.errors)){
                    workErrorDb(resp.errors);
                }
            });

            this.querySys.fSend(MsgT.delete, vMsg);
            this.iUpdate++;
        });
    }

    /** UPDATE IN
     * deleteIn('item.item_id', [22,33])
     */
     public deleteIn(sTableKey:string, whereIn:number[]|string[]){
        return new Promise((resolve, reject) => {

            const asTableKey = sTableKey.split('.');
            const sTable = asTableKey[0];
            const sWhereKey =  asTableKey[1] || 'id';

            if(!sTable && !sWhereKey && whereIn.length !== 0){
                reject(new Error(
                    'Запрос не корректный deleteIn, не подходит под правило - \n' + sTable +'.'+sWhereKey
                ))
            }

            let sQuery = '[]';
            try {
                sQuery = JSON.stringify(whereIn);
            } catch (e){
                reject(new Error(
                    'Не удалось данные провести серелизацию deleteIn'
                ))
            }

            this.querySys.fInit();

            const vMsg:QueryContextI = {
                uid:uuidv4(),
                app:this.conf.nameApp,
                ip:ip.address(),
                table:sTable,
                type:MsgT.delete_in,
                key_in:sWhereKey,
                query: sQuery,
                data:null,
                time:Date.now()
            }

            this.querySys.fActionOk((dataOut: any) => {

                // this.iSendComplete++;
                resolve(dataOut)
            });
            this.querySys.fActionErr((err:any) => {
                this.iSendErr++;
                console.error(err);
                reject(err)
            });

            this.querySys.fAction((ok:boolean, err:Record<string,string>,resp:any) => {
                if(_.size(resp.errors)){
                    workErrorDb(resp.errors);
                }
            });

            this.querySys.fSend(MsgT.delete_in, vMsg);
            this.iDelete++;
        });
    }

    /** DELETE JOIN */
    public deleteJoin(query:Knex.QueryBuilder|Knex.Raw) {
        return new Promise((resolve, reject) => {

            // Парсинг запроса
            const sql = query.toQuery();

            const sQueryStart = sql.substr(0, 100).toLowerCase().trim().replace(/`/g,'');
            const aMatch = sQueryStart.match(/^select\s+([a-z0-9_-]\.[a-z0-9_-]+)\s+as?\s+([a-z0-9_-]+)\s+from\s+([a-z0-9_-]+)\s+as\s+([a-z0-9_-]+)\s+(\bleft join\b|\bjoin\b|\bright join\b)/);

            let sSqlNew = ''
            let sWhereKey = ''
            let sTable = ''

            // Проверка синтаксиса
            if(aMatch){
                const aQueryStartNew = [];
                aQueryStartNew.push(...['select', aMatch[1], 'as', aMatch[2], 'from', aMatch[3], 'as', aMatch[4] ,' '])

                const sQueryStartRaw = sql.slice(0,100).toLowerCase()
                const iJoin = sQueryStartRaw.indexOf(' join ');
                const iLeft = sQueryStartRaw.indexOf(' left join ');
                const iRight = sQueryStartRaw.indexOf(' right join ');
                let iJoinPos = 0;
                iJoinPos = iJoin > iJoinPos ? iJoin : iJoinPos;
                iJoinPos = iLeft > 0 && iLeft < iJoinPos ? iLeft : iJoinPos;
                iJoinPos = iRight > 0 && iRight < iJoinPos ? iRight : iJoinPos;

                // результат парсинга
                sSqlNew = aQueryStartNew.join(' ') + sql.substr(iJoinPos)
                sWhereKey = aMatch[2];
                sTable = aMatch[3];

                console.log('>>>','key_id:',[sWhereKey], 'table_update:',[sTable] , '>>>',sSqlNew, );
                
            } else {
                reject(new Error(
                    'Запрос не корректный, не подходит под правило - \n' + 
                    '/^select\s+([a-z0-9_-]\.[a-z0-9_-]+)\s+as?\s+([a-z0-9_-]+)\s+from\s+([a-z0-9_-]+)\s+as\s+([a-z0-9_-]+)\s+(\bleft join\b|\bjoin\b|\bright join\b)/'
                ))
            }

            this.querySys.fInit();

            const vMsg:QueryContextI = {
                uid:uuidv4(),
                app:this.conf.nameApp,
                ip:ip.address(),
                table:sTable,
                key_in:sWhereKey,
                type:MsgT.delete,
                query:query.toString(),
                time:Date.now()
            }

            this.querySys.fActionOk((dataOut: any) => {

                console.log('[delete_join]:',dataOut);
                // this.iSendComplete++;
                resolve(dataOut)
            });
            this.querySys.fActionErr((err:any) => {
                this.iSendErr++;
                console.error(err);
                reject(err)
            });
            this.querySys.fAction((ok:boolean, err:Record<string,string>,resp:any) => {
                if(_.size(resp.errors)){
                    workErrorDb(resp.errors);
                }
            });
            this.querySys.fSend(MsgT.delete, vMsg);
            this.iUpdate++;
        });
    }

}