import { Knex } from "knex";
import _ from "lodash";
import { DbServerSys } from "..";
import { aCfDb } from "../Config/MainConfig";
import { mFormatDateTime } from "../Helper/DateTimeH";
import { adb, adbError, adbWait, dbProxy, gixDb, ixDbWaitTime } from "./DBConnect";
import * as conf from '../Config/MainConfig';

export class DbQueryLogSys {

    private idQuery = 0;
    private dbServerSys:DbServerSys = null;
    private aQueryReplicationBuffer:{
        id?:number;
        table:string;
        schema_id:number;
        cmd:string;
        data:string;
        created_at:string;
    }[] = [];

    /** construct */
    constructor(dbServerSys:DbServerSys){
        this.dbServerSys = dbServerSys;
    }
    

    /** добавить репликацию на вставку */
    public writeInsert(sTable:string, query:string){
        this.aQueryReplicationBuffer.push({
            table:sTable,
            schema_id:this.dbServerSys.idSchema,
            cmd:'insert',
            data:query,
            created_at:mFormatDateTime(Date.now())
        });
    }

    /** добавить репликацию на update */
    public writeUpdate(sTable:string, query:string){
        this.aQueryReplicationBuffer.push({
            table:sTable,
            schema_id:this.dbServerSys.idSchema,
            cmd:'update',
            data:query,
            created_at:mFormatDateTime(Date.now())
        });
    }

    /** добавить репликацию на update */
    public writeDelete(sTable:string, query:string){
        this.aQueryReplicationBuffer.push({
            table:sTable,
            schema_id:this.dbServerSys.idSchema,
            cmd:'delete',
            data:query,
            created_at:mFormatDateTime(Date.now())
        });
    }

    /** добавить репликацию на update */
    public writeSchema(sTable:string, query:string){
        this.aQueryReplicationBuffer.push({
            table:sTable,
            schema_id:this.dbServerSys.idSchema,
            cmd:'schema',
            data:query,
            created_at:mFormatDateTime(Date.now())
        });
    }

    /** Сохранить информацию по очереди */
    public async dbSave(){
        if(!this.aQueryReplicationBuffer.length || !conf.option.replication) return;


        const aDbLog = this.aQueryReplicationBuffer; // Данные для сохранения
        this.aQueryReplicationBuffer = [];

        if(this.idQuery == 0){
            let idMaxRepProxy = (await dbProxy('query')
                .max({id:'id'}))[0]?.id || 0;
            if(this.idQuery < idMaxRepProxy){
                this.idQuery  = idMaxRepProxy;
            }
        }

        for (let i = 0; i < aDbLog.length; i++) {
            aDbLog[i].id = ++this.idQuery;
        }
        

        const aaDbLogChunk = _.chunk(aDbLog, 1000);
        for (let i = 0; i < aaDbLogChunk.length; i++) {
            const aDbLogChunk = aaDbLogChunk[i];
            
            await dbProxy('query').insert(aDbLogChunk);
        }



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

}