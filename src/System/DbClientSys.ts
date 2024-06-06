
import { QuerySys } from "@a-a-game-studio/aa-front";

import { v4 as uuidv4 } from 'uuid';

import ip from 'ip'
import { QueryContextI, MsgT, QueryStatusI, QueryContextOptionI } from "../interface/CommonI";

import knex, { Knex } from "knex";
import _ from "lodash";
import { mRandomInteger } from "../Helper/NumberH";
import { mWait } from "../Helper/WaitH";

/** DbClientSys */
export class DbClientSys {

    conf:{
        env:string,
        baseURL: string, // 'ws://127.0.0.1:8080',
        nameApp: string, // Наименование приложения
    } = null;



    // =======================================================
    adb:Record<string, Knex> = {};
    adbError:Record<string, Knex> = {};
    
    adbAll:Record<string, Knex> = {};
    adbAllError:Record<string, Knex> = {};
    
    adbAllClaster:Record<string, Knex> = {};
    // =======================================================

    
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
    private iStatus = 0;
    private iRawQuery = 0;
    

    // Работа с буфером
    iLastTimeSend = Date.now();
    ixSendBuffer:Record<string, QueryContextI[]> = {};
    iSendBufferCount = 0;

    /** Наименование первичных ключей в таблице */
    private ixTablePrimaryKey:Record<string, string> = {};

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
        env?:string,
        baseURL: string, // 'ws://127.0.0.1:8080',
        nameApp: string, // Наименование приложения
    }){
        this.querySys = new QuerySys()
        this.querySys.fConfigWs(conf);
        this.conf = {
            ...conf,
            env: conf.env ? conf.env : 'prod'
        };

    }

    /** Заполнить инкрементный ID */
    public status():any{
       
        return new Promise((resolve, reject) => {
            this.iStatus++;

            this.querySys.fInit();

            // ==============

            const vMsg:QueryContextI = {
                uid:uuidv4(),
                app:this.conf.nameApp,
                ip:ip.address(),
                table:null,
                type:MsgT.status,
                data:{
                    cnt_insert:this.iInsert,
                    cnt_update:this.iUpdate,
                    cnt_delete:this.iDelete,
                    cnt_select:this.iSelect,
                    cnt_sync:this.iStatus
                },
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

                if(this.conf.env == 'dev'){
                    console.log('STATUS>>>', data);
                }

                if(data?.adb?.length){
                    for (let i = 0; i < data.adb.length; i++) {
                        const sDbConnect = data.adb[i];
                        if(!this.adb[sDbConnect] && this.adbError[sDbConnect]){
                            resp.errors['append_db'] = 'Присоединение БД через STATUS';
                            resp.errors['append_db'+':'+sDbConnect];
                        }
                    }
                }
                if(data?.adbError?.length){
                    for (let i = 0; i < data.adbError.length; i++) {
                        const sDbConnect = data.adbError[i];
                        if(this.adb[sDbConnect] && !this.adbError[sDbConnect]){
                            resp.errors['leve_db'] = 'Отсоединение БД через STATUS';
                            resp.errors['leve_db'+':'+sDbConnect];
                        }
                    }
                }
                
                if(_.size(resp.errors)){
                    this.workErrorDb(resp.errors);
                }

                resolve(resp)
                
            });

            this.querySys.fSend(MsgT.status, vMsg);
            this.iSend++;
        })
        
    }

    /** Проверка/ожидание соединения */
    public async checkConnect(sAction:string){
        if(!this.bInitDbConnect){
            while(!this.bInitDbConnect){
                this.connect();
                console.log('Пытаемся соединится с БД для чтения - действие: '+sAction, this.conf);
                await mWait(1000);
                
            }
        }
    }

    /** Заполнить инкрементный ID */
    public async connect(){
        if(!this.conf) return;
        if(this.bInitDbConnect) { console.log('Соединение уже установленно'); return; };
        if(this.bInitDbProcess) { console.log('Соединение в процессe...'); return; };

        this.bInitDbProcess = true;

        if(!Object.keys(this.adb).length){
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
                console.log('data.ixPrimaryKey',data.ixPrimaryKey)
                this.ixTablePrimaryKey = data.ixPrimaryKey || {};
                
                if(Object.keys(data.adb).length){
                    for (let [k,db] of Object.entries(data.adb)) {

                        this.adb[k] = knex(db);
                    }

                } else if(Object.keys(data.adbAll).length){
                    for (let [k,db] of Object.entries(data.adbAll)) {
                        
                        //adb.push(knex(db))
                        this.adb[k] = knex(db);
                    }
                }

                if(Object.keys(data.adbAll).length){
                    for (let [k,db] of Object.entries(data.adbAll)) {
                        
                        this.adbAll[k] = knex(db);
                        this.adbAllClaster[k] = knex(db);
                        // adbAll.push(knex(db))
                        // adbAllClaster.push(knex(db))
                    }
                }

                if(Object.keys(this.adb).length){
                    this.bInitDbConnect = true;

                    /** Интервал записи данных в бд */
                    this.intervalDbStatus = setInterval(async () => {
                        if(this.bInitDbConnect){
                            this.status();
                        }
                    },60*1000)
                    
                    console.log('Соединение на чтение успешно установленно');
                } else {
                    console.log('Соединения на чтение отсутствуют');
                }
                this.bInitDbProcess = false;
            });   

            this.querySys.fActionErr((err:any) => {
                this.iSendErr++;
                console.error('ERROR>>>',err);
                this.bInitDbConnect = false;
                this.bInitDbProcess = false;
            });
            this.querySys.fSend(MsgT.connect, vMsg);
        }
    }


    /** Заполнить инкрементный ID */
    public fillID(sTableIn:string, aRowsIn:any[]):any{

        const asTable = sTableIn.split('.');
        const sTable = asTable[0];
        const idTable =  asTable[1] || this.ixTablePrimaryKey[sTable] || 'id';
       
        return new Promise(async (resolve, reject) => {
            await this.checkConnect('fillId');

            this.querySys.fInit();

            let aRows = aRowsIn;

            let cntID = 0;
            
            
            if(aRows.length){
                for (let i = 0; i < aRows.length; i++) {
                    const vRow = aRows[i];

                    if(!vRow[idTable]){
                        
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

                        if(!vRows[idTable]){
                            
                            vRows[idTable] = data[iFillID];
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

    /** Схема
     * @returns id выполненного запроса миграции
     */
    public schema(table:string, query:Knex.SchemaBuilder):Promise<number>{
        return new Promise(async (resolve, reject) => {
            // Парсинг запроса
            const sql = query.toQuery();

            const sQueryStart = sql.substr(0, 100).toLowerCase().trim().replace(/`/g,'');

            console.log('[SCHEMA]:',sQueryStart);

            const aMatch = sQueryStart.match(/^(alter)|(create)|(drop)|(truncate)/);

            if(!aMatch){
                reject(new Error(
                    'Запрос не корректный, не подходит под правило - \n' + 
                    '/^(alter)|(create)|(drop)|(truncate)/'
                ))
            }

            await this.checkConnect('schema');

            
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

                // console.log('[id_in]:',data);
                // this.iSendComplete++;
                resolve(data)
            });
            this.querySys.fActionErr((err:any) => {
                this.iSendErr++;
                console.error(err);
                reject(err)
            });
            this.querySys.fSend(MsgT.schema, vMsg);
        });
    }

    /** 
     * exeRaw QUERY небезапасный запрос
     */
    public async exeRaw(query:Knex.Raw): Promise<any[]>{
        await this.checkConnect('raw');

        const sql = query.toQuery();

        const sQueryStart = sql.substr(0, 50).toLowerCase().trim().replace(/`/g,'');

        const aMatchSelect = sQueryStart.match(/^(select)|(show)|(call suggest)/);

        let out = null;
        if(aMatchSelect){
            out = await this.select(query);
        } else {
            console.log('exeRaw-WARNING>>>', sql)
            out = await (new Promise(async (resolve, reject) => {
                
                this.querySys.fInit();

                const vMsg:QueryContextI = {
                    uid:uuidv4(),
                    app:this.conf.nameApp,
                    ip:ip.address(),
                    table:'*',
                    type:MsgT.raw,
                    query: sql,
                    time:Date.now()
                }

                this.querySys.fActionOk((dataOut: any) => {
                    resolve(dataOut)
                });
                this.querySys.fActionErr((err:any) => {
                    this.iSendErr++;
                    console.error(err);
                    reject(err)
                });

                this.querySys.fAction((ok:boolean, err:Record<string,string>,resp:any) => {
                    if(_.size(resp.errors)){
                        this.workErrorDb(resp.errors);
                    }
                });

                this.querySys.fSend(MsgT.raw, vMsg);
                
            }))
            
        }

        this.iRawQuery++;

        return out;

    }

    /** 
     * exe QUERY
     */
    public async exe<T = any>(query:Knex.QueryBuilder|Knex.Raw): Promise<T>{

        

        let out = null;
        if((<any>query)._method){
            const vQueryIn = (<any>query);

            if(['select', 'first', 'pluck'].includes(vQueryIn._method)){
                out = await this.select(query);
            } else if(vQueryIn._method == 'insert'){
                if(vQueryIn._single.onConflict){
                    
                    let option:QueryContextOptionI = {}
                    if(vQueryIn._single.merge){
                        let option = {merge:['*']};
                        if(vQueryIn._single.merge.updates?.length){
                            option.merge = vQueryIn._single.merge.updates
                        } else {
                            option.merge = [vQueryIn._single.merge.updates];
                        }
                    }
                    if(vQueryIn._single.ignore){
                        option.mergeIgnore = true;
                    }

                    option.insertId = true;
                    out = await this.insert(vQueryIn._single.table, vQueryIn._single.insert, option)
                } else {
                    out = await this.insert(vQueryIn._single.table, vQueryIn._single.insert, {insertId:true})
                }
                
            } else if(vQueryIn._method == 'del'){
                
                if(vQueryIn._statements.length == 1 && !vQueryIn._single.limit){
                    if(vQueryIn._statements[0].type == 'whereIn'){
                        out = await this.deleteIn(vQueryIn._single.table+'.'+vQueryIn._statements[0].column, vQueryIn._statements[0].value);
                    } else if(vQueryIn._statements[0].type == 'whereBasic' && vQueryIn._statements[0].operator == '='){
                        out = await this.deleteIn(vQueryIn._single.table+'.'+vQueryIn._statements[0].column, vQueryIn._statements[0].value);
                    } else {
                        console.log('ERROR>>> PORXY dbExe DEL НЕ нашел решения', vQueryIn)
                    }
                } else {
                    vQueryIn._method = 'select'
                    vQueryIn.pluck(this.ixTablePrimaryKey[vQueryIn._single.table] || 'id')
                    out = await this.deleteQuery(vQueryIn._single.table, vQueryIn)
                }
                
            } else if(vQueryIn._method == 'update'){

                // console.log('QueryUpdate>>>',(<any>query));
                const option:QueryContextOptionI = {};
                if(vQueryIn._single.onConflict){
                    
                    if(vQueryIn._single.merge){
                        option.merge = ['*'];
                        if(vQueryIn._single.merge.updates?.length){
                            option.merge = vQueryIn._single.merge.updates
                        } else {
                            option.merge = [vQueryIn._single.merge.updates];
                        }
                    }
                    if(vQueryIn._single.ignore){
                        option.mergeIgnore = true;
                    }
                }
                if(vQueryIn._single.counter){
                    option.updateRaw = {};
                    // counter
                    for (const key in vQueryIn._single.counter) {
                        option.updateRaw[key] = `${key} + ${vQueryIn._single.counter[key]}`;
                    }

                }
                if(vQueryIn._statements.length == 1 && !vQueryIn._single.limit){
                    if(vQueryIn._statements[0].type == 'whereIn'){
                        out = await this.updateIn(
                            vQueryIn._single.table+'.'+vQueryIn._statements[0].column, 
                            vQueryIn._statements[0].value,
                            vQueryIn._single.update || {},
                            option
                        );
                    } else if(vQueryIn._statements[0].type == 'whereBasic' && vQueryIn._statements[0].operator == '='){
                        out = await this.updateIn(
                            vQueryIn._single.table+'.'+vQueryIn._statements[0].column, 
                            vQueryIn._statements[0].value,
                            vQueryIn._single.update || {},
                            option
                        );
                    } else {
                        console.log('ERROR>>> PROXY dbExe UPDATE НЕ нашел решения', vQueryIn);
                    }
                } else {
                    vQueryIn._method = 'select'
                    vQueryIn.pluck(this.ixTablePrimaryKey[vQueryIn._single.table] || 'id')
                    out = await this.updateQuery(vQueryIn._single.table, vQueryIn._single.update, vQueryIn, option)
                }
                
            } else {
                console.log('knex builder>>> PROXY dbExe НЕ нашел решения', vQueryIn)
            }

        } else { // RAW QUERY
            out = await this.exeRaw(<Knex.Raw>query);
        }

        return out;

    }

    /** SELECT */
    public async select<T = any>(query:Knex.QueryBuilder|Knex.Raw): Promise<T> {

        const builder = <any>query;
        
        // Парсинг запроса
        const sql = query.toQuery();

        const sQueryStart = sql.substr(0, 100).toLowerCase().trim().replace(/`/g,'');

        // console.log(sQueryStart);

        const aMatch = sQueryStart.match(/^(select)|(show)|(call suggest)/);

        if(!aMatch){
            throw (new Error(
                'Запрос не корректный, не подходит под правило - \n' + 
                '/^(select)|(call suggest)/'
            ))
        }

        await this.checkConnect('select');

        // Случайно отдаем одну базу данных из пула
        
        

        // console.log('>>>SELECT:', ' БД по IP',adb.length, ' БД доступные',adbAll.length)
        
        let out:T = null;
        let okExe = true;
        let vError = null; // Ошибка заполняется если при первом запросе она произошла

        const akAdb = Object.keys(this.adb);
        
        try { // из случайной БД своего контура

            if(akAdb?.length > 0){
                const iRand = akAdb[mRandomInteger(0, akAdb.length - 1)]
                const dbSelect = this.adb[iRand];
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
                vError = new Error('БД недоступна - '+this.conf?.nameApp+' - БД по IP'+this.adb?.length+' БД доступные - '+this.adbAll?.length);
            }
        } catch (e) {
            console.log('БД недоступна - '+this.conf?.nameApp+' - БД по IP'+this.adb?.length+' БД доступные - '+this.adbAll?.length);
            okExe = false
            vError = e;
        }

        const akAdbAll = Object.keys(this.adbAll);
        if(!okExe && akAdb?.length > 0){ // В случае ошибки, последовательно попытаться выполнить запрос из оставшихся БД своего контура
            console.log('SELECT ERROR - БД IP:', ' БД по IP',akAdb.length, ' БД доступные',akAdbAll.length)
            for (const i in this.adb) {
                const dbSelect = this.adb[i];

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
            for (const i in this.adbAll) {
                const dbSelect = this.adbAll[i];
                
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

        const akAdbAllClaster = Object.keys(this.adbAllClaster);
        if(!okExe && akAdbAllClaster?.length > 0){ // В случае ошибки, последовательно попытаться выполнить запрос из оставшихся БД доступных приложению
            console.log('SELECT ERROR - БД ALL CLUSTER:', ' БД по IP',akAdb.length, ' БД доступные',akAdbAll.length)
            for (const i in this.adbAllClaster) {
                const dbSelect = this.adbAllClaster[i];
                
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
    public async insert<T>(table:string, dataIn:T|T[], option?:QueryContextOptionI): Promise<T[]>{
        const aDatePrepare = ((<any>dataIn)?.length ? dataIn : [dataIn]) as T[];

        await this.fillID(table, aDatePrepare)

        return new Promise(async (resolve, reject) => {

            this.querySys.fInit();

            const vMsg:QueryContextI = {
                uid:uuidv4(),
                app:this.conf.nameApp,
                ip:ip.address(),
                table:table,
                type:MsgT.insert,
                data:aDatePrepare,
                option:option,
                time:Date.now()
            }

            this.querySys.fActionOk((dataOut: any) => {
                // if(dataOut){
                //     // console.log('insert end', dataOut)
                // }
                if(option?.insertId){ // Возвращаем исключительно идентификаторы
                    const asTable = table.split('.');
                    const sTable = asTable[0];
                    const idTable =  asTable[1] || this.ixTablePrimaryKey[sTable] || 'id';
                    resolve(aDatePrepare.map(el => (<any>el)[idTable]));
                } else {
                    resolve(aDatePrepare);
                }
                
            });
            this.querySys.fActionErr((err:any) => {
                console.error('ERROR INSERT CLIENT>>>', err);
                reject(err)
            });
            this.querySys.fAction((ok:boolean, err:Record<string,string>,resp:any) => {
                if(_.size(resp.errors)){
                    this.workErrorDb(resp.errors);
                }
            });
            this.querySys.fSend(MsgT.insert, vMsg);
            this.iInsert++;

            // console.log('insert init')
        });
    }

    /** REPLCAE by primary key */
    public async replace(table:string, dataIn:any|any[]){
        const aDatePrepare = dataIn.length ? dataIn : [dataIn];

        return new Promise(async (resolve, reject) => {

            await this.checkConnect('replace');

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
                // if(dataOut){
                //     // console.log('replace end', dataOut)
                // }
                resolve(dataIn)
            });
            this.querySys.fActionErr((err:any) => {
                console.error('ERROR REPLACE CLIENT>>>', err);
                reject(err)
            });
            this.querySys.fAction((ok:boolean, err:Record<string,string>,resp:any) => {
                if(_.size(resp.errors)){
                    this.workErrorDb(resp.errors);
                }
            });
            this.querySys.fSend(MsgT.replace, vMsg);
            this.iInsert++;

        });
    }

    /** UPDATE IN
     * updateIn('item.item_id', [22,33], {name:'new_name'})
     */
    public updateIn(sTableKey:string, whereIn:number[]|string[], dataIn:any, option?:QueryContextOptionI): Promise<number[]>{
        return new Promise(async (resolve, reject) => {

            const asTableKey = sTableKey.split('.');
            const sTable = asTableKey[0];
            const sWhereKey =  asTableKey[1] || this.ixTablePrimaryKey[sTable] || 'id';

            // console.log(whereIn);

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

            await this.checkConnect('updateIn');

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
                option:option,
                time:Date.now()
            }

            this.querySys.fActionOk((dataOut: any) => {

                // console.log('[update]:',dataOut);
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
                    this.workErrorDb(resp.errors);
                }
            });

            this.querySys.fSend(MsgT.update_in, vMsg);
            this.iUpdate++;
        });
    }

    /** UPDATE */
    public update(dataIn:any, query:Knex.QueryBuilder|Knex.Raw, option?:QueryContextOptionI): Promise<number[]>{
        return new Promise(async (resolve, reject) => {

            // Парсинг запроса
            const sql = query.toQuery();

            const sQueryStart = sql.substr(0, 100).toLowerCase().trim().replace(/`/g,'');

            // console.log(sQueryStart);

            const aMatch = sQueryStart.match(/^select\s+([a-z0-9_-]+)\s+as?\s+([a-z0-9_-]+)\s+from\s+([a-z0-9_-]+)\s+where/);

            let sSqlNew = ''
            let sWhereKey = ''
            let sTable = ''

            // console.log(aMatch);

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

            await this.checkConnect('update');

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
                option:option,
                time:Date.now()
            }

            this.querySys.fActionOk((dataOut: any) => {

                // console.log('[update]:',dataOut);
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
                    this.workErrorDb(resp.errors);
                }
            });

            this.querySys.fSend(MsgT.update, vMsg);
            this.iUpdate++;
        });
    }

    /** 
     * UPDATE QUERY
     * updateQuery('test',  {text:'update_primary_key'}, db('test').whereIn('id',[33,11,44]).pluck('id'))
     * updateQuery('test.num', {text:'update_where_in'}, db('test').whereIn('id',[33,11,44]).pluck('num'))
     */
    public updateQuery(sTableKey:string, dataIn:any, query:Knex.QueryBuilder|Knex.Raw, option?:QueryContextOptionI): Promise<number[]>{
        const asTableKey = sTableKey.split('.');
        const sTable = asTableKey[0];
        const sWhereKey =  asTableKey[1] || this.ixTablePrimaryKey[sTable] || 'id';

        return new Promise(async (resolve, reject) => {

            // Парсинг запроса
            const sql = query.toQuery();

            const sQueryStart = sql.substr(0, 100).toLowerCase().trim().replace(/`/g,'');

            const aMatch = sQueryStart.match(/^select.+from.+where/);

            let sQuery = '[]';
            // Проверка синтаксиса
            if(aMatch){

                try{
                    let aid:number[]|string[] = await this.select(query);
                    aid = _.uniq(<any[]>aid)
                    
                    sQuery = sQuery = JSON.stringify(aid);
                } catch(e) {
                    console.log('ERROR>>>', sql);
                    reject(e);
                }
                
            } else {
                reject(new Error(
                    'Запрос не корректный, не подходит под правило' +
                    '/^select.+from.+where/'
                ))
            }

            await this.checkConnect('updateQuery');

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
                option:option,
                time:Date.now()
            }

            this.querySys.fActionOk((dataOut: any) => {

                // console.log('[update_join]:',dataOut);
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
                    this.workErrorDb(resp.errors);
                }
            });
            this.querySys.fSend(MsgT.update_in, vMsg);
            this.iUpdate++;
        });
    }

    /** DELETE */
    public delete(query:Knex.QueryBuilder|Knex.Raw): Promise<number[]> {
        return new Promise(async (resolve, reject) => {

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

            await this.checkConnect('delete');

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

                // console.log('[dataOut]:',dataOut);
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
                    this.workErrorDb(resp.errors);
                }
            });

            this.querySys.fSend(MsgT.delete, vMsg);
            this.iDelete++;
        });
    }

    /** UPDATE IN
     * deleteIn('item.item_id', [22,33])
     */
     public deleteIn(sTableKey:string, whereIn:number[]|string[]):Promise<number[]>{
        const asTableKey = sTableKey.split('.');
        const sTable = asTableKey[0];
        const sWhereKey =  asTableKey[1] || this.ixTablePrimaryKey[sTable] || 'id';

        return new Promise(async (resolve, reject) => {

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

            await this.checkConnect('deleteIn');

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
                    this.workErrorDb(resp.errors);
                }
            });

            this.querySys.fSend(MsgT.delete_in, vMsg);
            this.iDelete++;
        });
    }

    /** 
     * DELETE QUERY
     * deleteQuery('item', db('item').where('product_id':5).pluck('item_id'))
     * deleteQuery('item.product_id', db('item').whereIn('item_id':[22,33,44]).pluck('product_id'))
     */
    public deleteQuery(sTableKey:string, query:Knex.QueryBuilder|Knex.Raw):Promise<number[]> {
        const asTableKey = sTableKey.split('.');
        const sTable = asTableKey[0];
        const sWhereKey =  asTableKey[1] || this.ixTablePrimaryKey[sTable] || 'id';

        return new Promise(async (resolve, reject) => {

            // Парсинг запроса
            const sql = query.toQuery();

            const sQueryStart = sql.substr(0, 100).toLowerCase().trim().replace(/`/g,'');

            const aMatch = sQueryStart.match(/^select.+from.+where/);

            let sQuery = '[]';
            // Проверка синтаксиса
            if(aMatch){

                try{
                    let aid:number[]|string[] = await this.select(query);
                    aid = _.uniq(<any[]>aid)
                    
                    sQuery = sQuery = JSON.stringify(aid);
                } catch(e) {
                    console.log('ERROR>>>', sql);
                    reject(e);
                }
                
            } else {
                reject(new Error(
                    'Запрос не корректный, не подходит под правило' +
                    '/^select.+from.+where/'
                ))
            }

            await this.checkConnect('deleteQuery');

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
                    this.workErrorDb(resp.errors);
                }
            });
            this.querySys.fSend(MsgT.delete_in, vMsg);
            this.iDelete++;
        });
    }


    /** Обработка ошибок отключения/присоединения БД */
    workErrorDb(errors:Record<string,string>){
        try {
            console.log(
                '>>>workErrorDb.STATUS_START:', 
                ' БД по IP',Object.keys(this.adb)?.length,'|',Object.keys(this.adbError)?.length, 
                ' БД доступные',Object.keys(this.adbAll)?.length,'|',Object.keys(this.adbAllError)?.length
            )
            if(errors['leve_db']){
                for (const i in this.adb) {
                    const vConnect = this.adb[i].client.config.connection;
                    // console.log('ERROR>>>', vConnect.host, vConnect.port, vConnect.database);
                    
                    if(errors['leve_db'+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database]){
    
                        // // Если одновременно и добавление и удаление
                        // if(errors['append_db'+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database]){
                        //     // delete errors['leve_db'+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database];
                        //     // delete errors['append_db'+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database];
                        //     continue;
                        // }
                        if(this.adb[i]){
                            this.adbError[i] = this.adb[i];
                        }
                        delete this.adb[i];
                        console.log('Отключение проблемной БД IP')
                    }
                }
                for (const i in this.adbAll) {
                    const vConnect = this.adbAll[i].client.config.connection;
                    // console.log('ERROR>>>', vConnect.host, vConnect.port, vConnect.database);
                    
                    if(errors['leve_db'+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database]){
    
                        // // Если одновременно и добавление и удаление
                        // if(errors['append_db'+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database]){
                        //     // delete errors['leve_db'+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database];
                        //     // delete errors['append_db'+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database];
                        //     continue;
                        // }
                        if(this.adbAll[i]){
                            this.adbAllError[i] = this.adbAll[i];
                        }
                        delete this.adbAll[i];
                        console.log('Отключение проблемной БД All')
                    }
                }
            }
    
            if(errors['append_db']){
                for (const i in this.adbError) {
                // for (let i = 0; i < adbError.length; i++) {
                    const vConnect = this.adbError[i].client.config.connection;
                    if(errors['append_db'+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database]){
                        if(this.adbError[i]){
                            this.adb[i] = this.adbError[i];
                        }
                        delete this.adbError[i];
    
                        console.log('Добавление проблемной БД IP')
                    }
                    
                }
    
                for (const i in this.adbAllError) {
                // for (let i = 0; i < adbAllError.length; i++) {
                    const vConnect = this.adbAllError[i].client.config.connection;
                    if(errors['append_db'+':'+vConnect.host+':'+vConnect.port+':'+vConnect.database]){
                        if(this.adbAllError[i]){
                            this.adbAll[i] = this.adbAllError[i];
                        }
                        delete this.adbAllError[i];
    
                        console.log('Добавление проблемной БД ALL')
                    }
    
                }
            }
        } catch(e) {
            console.log('ProxyDb.workErrorDb>>>',e);
        }
    
        console.log(
            '>>>workErrorDb.STATUS_END:', 
            ' БД по IP',Object.keys(this.adb)?.length,'|',Object.keys(this.adbError)?.length, 
            ' БД доступные',Object.keys(this.adbAll)?.length,'|',Object.keys(this.adbAllError)?.length
        )
    }

}