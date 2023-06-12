
import { QuerySys } from "@a-a-game-studio/aa-front";

import { v4 as uuidv4 } from 'uuid';

import ip from 'ip'
import { QueryContextI, MsgT } from "../interface/CommonI";

import knex, { Knex } from "knex";
import _ from "lodash";
import { mRandomInteger } from "../Helper/NumberH";
import { mWait } from "../Helper/WaitH";

let adb:Knex[] = [];

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


    /** init */
    constructor(conf:{
        baseURL: string, // 'ws://127.0.0.1:8080',
        nameApp: string, // Наименование приложения
    }){
        this.querySys = new QuerySys()
        this.querySys.fConfigWs(conf);
        this.conf = conf;

        if(!adb.length){
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
                if(Object.keys(data.adb).length){
                    for (let [k,db] of Object.entries(data.adb)) {
                        // const db = data.adb[i];
                        adb.push(knex(db))
                    }
                }

                if(adb.length){
                    this.bInitDbConnect = true;

                    console.log('Соединение на чтение успешно установленно');
                } else {
                    console.log('Соединения на чтение отсутствуют');
                }
            });   

            this.querySys.fActionErr((err:any) => {
                this.iSendErr++;
                console.error(err);
                this.bInitDbConnect = false;
            });
            this.querySys.fSend(MsgT.connect, vMsg);
        }

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

            const aMatch = sQueryStart.match(/^(select)|(insert)|(update)|(delete)|(alter)|(create)|(drop)/);

            if(aMatch){
                reject(new Error(
                    'Запрос не корректный, подходит под правило - только общие запросы - \n' + 
                    '/^(select)|(insert)|(update)|(delete)|(alter)|(create)|(drop)/'
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
        const iRand = mRandomInteger(0, adb.length - 1)
        const dbSelect = adb[iRand];
        builder.client = dbSelect.client
        
        let out:T = null;
        // Выполнить запрос
        if (builder._method){ // _method только у билдера
            out = await builder
        } else {
            out = (await builder)[0]
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
                console.log('insert end')
                resolve(dataIn)
            });
            this.querySys.fActionErr((err:any) => {
                console.error(err);
                reject(err)
            });
            this.querySys.fSend(MsgT.insert, vMsg);
            this.iInsert++;

            console.log('insert init')
        });
    }

    /** UPDATE 
     * TODO пока не работает
     * updateIn('item.id', [22,33], {name:'new_name'})
     */
    public updateIn(sTableKey:string, whereIn:number[], dataIn:any){
        return new Promise((resolve, reject) => {

            const asTableKey = sTableKey.split('.');
            const sTable = asTableKey[0];
            const sWhereKey =  asTableKey[1];

            let aidWhereIn = [];
            for (let i = 0; i < whereIn.length; i++) {
                const idIn = Number(whereIn[i]);
                if(idIn){
                    aidWhereIn.push(whereIn[i]);
                } else if(idIn === 0){
                    aidWhereIn.push(0);
                }
            }

            aidWhereIn = _.uniq(aidWhereIn);

            if(!(sTable && sWhereKey)){
                reject(new Error(
                    'Запрос не корректный, не подходит под правило - \n' + sTable +'.'+sWhereKey
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
                query:whereIn.filter(el => Number(el) || el === 0).toString(),
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
            this.querySys.fSend(MsgT.update, vMsg);
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
            this.querySys.fSend(MsgT.delete, vMsg);
            this.iUpdate++;
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
            this.querySys.fSend(MsgT.delete, vMsg);
            this.iUpdate++;
        });
    }

}