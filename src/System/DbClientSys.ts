
import { QuerySys } from "@a-a-game-studio/aa-front";

import { v4 as uuidv4 } from 'uuid';

import ip from 'ip'
import { QueryContextI, MsgT } from "../interface/CommonI";

import knex, { Knex } from "knex";
import _ from "lodash";

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


        // Соединение
       

    }

    /** Заполнить инкрементный ID */
    public connect(sTable:string, aRows:any[]){
        this.querySys.fInit();
        this.querySys.fActionOk((data: any) => {
        });
        this.querySys.fActionErr((err:any) => {
        });
        this.querySys.fSend(MsgT.connect, null);
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

            const aMatch = sQueryStart.match(/^(alter)|(create)|(drop)/);

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
    public select(query:Knex.QueryBuilder|Knex.Raw){
        return new Promise((resolve, reject) => {

            // Парсинг запроса
            const sql = query.toQuery();

            const sQueryStart = sql.substr(0, 100).toLowerCase().trim().replace(/`/g,'');

            console.log(sQueryStart);

            const aMatch = sQueryStart.match(/^select/);

            if(!aMatch){
                reject(new Error(
                    'Запрос не корректный, не подходит под правило - \n' + 
                    '/^select/'
                ))
            }

            
            this.querySys.fInit();

            const vMsg:QueryContextI = {
                uid:uuidv4(),
                app:this.conf.nameApp,
                ip:ip.address(),
                table:'',
                type:MsgT.select,
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
            this.querySys.fSend(MsgT.select, vMsg);
            this.iSelect++;
        });
    }

    /** INSERT */
    public async insert(table:string, dataIn:any|any[],onConflict?:'ignore'|'merge'){
        await this.fillID(table, dataIn)

        return new Promise((resolve, reject) => {

            this.querySys.fInit();

            const vMsg:QueryContextI = {
                uid:uuidv4(),
                app:this.conf.nameApp,
                ip:ip.address(),
                table:table,
                type:MsgT.insert,
                data:dataIn,
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

    /** UPDATE */
    public update(dataIn:any|any[], query:Knex.QueryBuilder|Knex.Raw){
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

    /** UPDATE */
    public updateJoin(dataIn:any|any[], query:Knex.QueryBuilder|Knex.Raw){
        return new Promise((resolve, reject) => {

            // Парсинг запроса
            const sql = query.toQuery();

            const sQueryStart = sql.substr(0, 100).toLowerCase().trim().replace(/`/g,'');

            console.log(sQueryStart);

            const aMatch = sQueryStart.match(/^select\s+([a-z0-9_-]\.[a-z0-9_-]+)\s+as?\s+([a-z0-9_-]+)\s+from\s+([a-z0-9_-]+)\s+as\s+([a-z0-9_-]+)\s+(\bleft\b|\bjoin\b|\bright\b)/);

            let sSqlNew = ''
            let sWhereKey = ''
            let sTable = ''

            console.log(aMatch);

            // Проверка синтаксиса
            if(aMatch){
                const aQueryStartNew = [];
                aQueryStartNew.push(...['select', aMatch[1], 'as', aMatch[2], 'from', aMatch[3], ' '])

                const sQueryStartRaw = sql.slice(0,100).toLowerCase()
                const iJoin = sQueryStartRaw.indexOf('join');
                const iLeft = sQueryStartRaw.indexOf('left');
                const iRight = sQueryStartRaw.indexOf('left');
                let iJoinPos = 0;
                iJoinPos = iJoin > iJoinPos ? iJoin : iJoinPos;
                iJoinPos = iLeft > iJoinPos ? iLeft : iJoinPos;
                iJoinPos = iRight > iJoinPos ? iRight : iJoinPos;

                // результат парсинга
                sSqlNew = aQueryStartNew.join(' ') + sql.substr(iJoinPos)
                sWhereKey = aMatch[2];
                sTable = aMatch[3];
                
            } else {
                reject(new Error(
                    'Запрос не корректный, не подходит под правило - \n' + 
                    '/^select\s+([a-z0-9_-]\.[a-z0-9_-]+)\s+as?\s+([a-z0-9_-]+)\s+from\s+([a-z0-9_-]+)\s+as\s+([a-z0-9_-]+)\s+where/'
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

    /** DELETE */
    public deleteJoin(query:Knex.QueryBuilder|Knex.Raw) {
        return new Promise((resolve, reject) => {

            // Парсинг запроса
            const sql = query.toQuery();

            const sQueryStart = sql.substr(0, 100).toLowerCase().trim().replace(/`/g,'');

            const aMatch = sQueryStart.match(/^select\s+([a-z0-9_-]\.[a-z0-9_-]+)\s+as?\s+([a-z0-9_-]+)\s+from\s+([a-z0-9_-]+)\s+as\s+([a-z0-9_-]+)\s+(\bleft\b|\bjoin\b|\bright\b)/);

            let sSqlNew = ''
            let sWhereKey = ''
            let sTable = ''

            // Проверка синтаксиса
            if(aMatch){
                const aQueryStartNew = [];
                aQueryStartNew.push(...['select', aMatch[1], 'as', aMatch[2], 'from', aMatch[3], 'as', aMatch[4] ,' '])

                const sQueryStartRaw = sql.slice(0,100).toLowerCase()
                const iJoin = sQueryStartRaw.indexOf('join');
                const iLeft = sQueryStartRaw.indexOf('left');
                const iRight = sQueryStartRaw.indexOf('left');
                let iJoinPos = 0;
                iJoinPos = iJoin > iJoinPos ? iJoin : iJoinPos;
                iJoinPos = iLeft > iJoinPos ? iLeft : iJoinPos;
                iJoinPos = iRight > iJoinPos ? iRight : iJoinPos;

                // результат парсинга
                sSqlNew = aQueryStartNew.join(' ') + sql.substr(iJoinPos)
                sWhereKey = aMatch[2];
                sTable = aMatch[3];
                
            } else {
                reject(new Error(
                    'Запрос не корректный, не подходит под правило - \n' + 
                    '/^select\s+([a-z0-9_-]\.[a-z0-9_-]+)\s+as?\s+([a-z0-9_-]+)\s+from\s+([a-z0-9_-]+)\s+as\s+([a-z0-9_-]+)\s+where/'
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

}