import { ErrorSys } from "@a-a-game-studio/aa-components";
import { AAContext } from "@a-a-game-studio/aa-server";

import * as conf from '../Config/MainConfig';




/**
 * Базовый контроллер
 */
 export default class Ctrl {

    public ctx: AAContext;
    
    constructor(ctx: AAContext){
        this.ctx = ctx;
        ctx.err = new ErrorSys();
        if(!ctx.body.errors){
            ctx.body.errors = {};
        }
    }

    protected fClassName() {
        return this.constructor.name;
    }

    /**
     * Функция рендера страницы
     * @param faCallback - функция контролера
     */
     async faSend(data:any): Promise<boolean> {

        // console.log('TEST>>>',this.ctx.body.errors);
        if(this.ctx.err.isOk()){
            try {
                this.ctx.ws.send(JSON.stringify({
                    ok: true,
                    e: false,
                    n:this.ctx.n,
                    data: data,
                    errors:{...this.ctx.body.errors, ...this.ctx.err.getErrors()}
                }));
            } catch (e) {
                this.ctx.err.errorEx(e, this.ctx.req.url, 'Ошибка маршрута');
                this.ctx.ws.send(JSON.stringify({
                    ok: false,
                    e: true,
                    n:this.ctx.n,
                    data: null,
                    errors:{...this.ctx.body.errors, ...this.ctx.err.getErrors()}
                }));
                
            }
        } else {
            this.ctx.err.error(this.ctx?.body?.type, 'Ошибка операции - '+this.ctx?.body?.ip+'/'+this.ctx?.body?.app);
            if(conf.common.env == 'dev'){
                console.log(
                    '\n==================================\n',
                    this.ctx?.body?.type, '[Ошибка операции]: '+this.ctx?.body?.ip+'/'+this.ctx?.body?.app, 
                    '\n[query]: ',this.ctx?.body?.query,
                    '\n[data]:',this.ctx?.body?.data,
                    '\n==================================\n',
                );
            } else {
                console.log(
                    this.ctx?.body?.type, '[Ошибка операции]: '+this.ctx?.body?.ip+'/'+this.ctx?.body?.app, 
                );
            }
            this.ctx.ws.send(JSON.stringify({
                ok: false,
                e: true,
                n:this.ctx.n,
                data: null,
                errors:{...this.ctx.body.errors, ...this.ctx.err.getErrors()}
            }));
        }
        

        return false;
    };


    /**
     * 
     * @param msg - Сообщение
     * @param cbAction - Анонимная функция для вызова действия
     */
    public async faAction(cbAction:Function){
        
        let out = null;
        if(this.ctx.err.isOk()){
            try {
                const data = await Promise.race([
                    cbAction(),
                    new Promise((resolve, reject) => setTimeout(() => {
                        this.ctx.err.error('timeout', 'Превышено время ожидания выполения');
                        reject(new Error("request timed out"))
                    }, conf.option.timeoutQuery)),
                ]);
                
                out = data;
            } catch (e) {
                this.ctx.err.errorEx(e, 'fatal_error', 'Ошибка сервера');
                console.log('>>>ERROR>>>', e);
                // this.resp.status(500)
            }  
        } else {
            // this.resp.status(401)
            this.ctx.err.error('init_ctrl', 'Авторизация или активация провалились')
        }

        return out;
    }


}
