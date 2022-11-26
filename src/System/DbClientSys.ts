import { QuerySys } from "@a-a-game-studio/aa-front";
import { resolve } from "dns";
import e from "express";

import { v4 as uuidv4 } from 'uuid';

import ip from 'ip'
import { reject } from "lodash";
import { mWait } from "../Helper/WaitH";
import { MsgContextI as QueryContextI, MsgT } from "../interface/CommonI";

import knex from "knex";


export class DbClientSys {

    conf:{
        baseURL: string, // 'ws://127.0.0.1:8080',
        nameApp: string, // Наименование приложения
    } = null;

   

    private querySys:QuerySys = null;
    iSend:number = 0;
    iSendComplete:number = 0;
    iSendErr:number = 0;
    

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
    }

    /** Заполнить инкрементный ID */
    public fillID(sTable:string, data:any|any[]){

        let cntID = 0;
        
        if(data.length){
            for (let i = 0; i < data.length; i++) {
                const vRow = data[i];

                if(!vRow.id){
                    
                    cntID++;
                }
            }
        } else {
            if(!data.uid){
                cntID++;
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

        this.querySys.fInit();
        this.querySys.fActionOk((data: string[]) => {

            console.log('[id]:',data);
            this.iSendComplete++;

        });
        this.querySys.fActionErr((err:any) => {
            this.iSendErr++;
            console.error(err);
        });
        this.querySys.fSend(MsgT.insert, vMsg);
        this.iSend++;

        // ==============

        if(data.length){
            for (let i = 0; i < data.length; i++) {
                const vRow = data[i];

                if(!vRow.id){
                    
                    vRow
                }
            }
        } else {
            if(!data.uid){
                cntID++;
            }
        }
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

    /** SELECT */
    public select(query:knex.QueryBuilder){

    }

    /** INSERT */
    public insert(data:any|any[]){

    }

    /** UPDATE */
    public update(query:knex.QueryBuilder, data:any|any[]){

    }

    /** DELETE */
    public delete(query:knex.QueryBuilder){

    }

    /**
	 * Отправить сообщение в очередь
	 * @param sQueue
	 * @param msg
	 */
	public send(sQueue: string, msg: any): void {

        const uidMsg = uuidv4();
        const vMsg = {
            uid:uidMsg,
            app:this.conf.nameApp,
            ip:ip.address(),
            queue:sQueue,
            data:msg,
            time:Date.now()
        }

        this.querySys.fInit();
        this.querySys.fActionOk((data: string[]) => {

            this.iSendComplete++;

        });
        this.querySys.fActionErr((err:any) => {
            this.iSendErr++;
            console.error(err);
        });
        this.querySys.fSend(MsgT.insert, vMsg);
        this.iSend++;
	}

}