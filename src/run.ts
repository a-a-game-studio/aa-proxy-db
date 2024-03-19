
import { AAContext, AARoute, AAServer } from '@a-a-game-studio/aa-server';


import Ctrl from './System/ResponseSys';

import { QueryContextI, MsgT } from './interface/CommonI';
import { DbServerSys } from './System/DbServerSys';
import * as conf from './Config/MainConfig';
import { ErrorSys } from '@a-a-game-studio/aa-components';
import { DbReplicationSys } from './System/DbReplicationSys';
import { adb, adbError, adbWait } from './System/DBConnect';
import { mFormatDateTime } from './Helper/DateTimeH';

let cntConnect = 0;

const gDbServerSys = new DbServerSys();
const gDbReplicationSys = new DbReplicationSys();

gDbServerSys.dbInit();


/** Интервал записи данных в бд */
const intervalDb = setInterval(async () => {
    
    if(conf.option.replication){
        await gDbServerSys.dbSave();
        await gDbReplicationSys.dbReplication();
        await gDbReplicationSys.dbCheckReplication();
    }

    
    
    if(parseInt(String(Date.now() / 1000)) % 30 == 0){ // Каждые 30 секунд
        console.log('>>>INTERVAL DB EXE', adb.length, adbWait.length, adbError.length, mFormatDateTime())   

        // В случае если БД отключена проверяем наличие БД и включаем ее обратно
        if(!conf.option.replication){
            await gDbReplicationSys.dbReconnectToAvailable();
        }
    }
},1000)


// =============================================================
// var remoteSocket = new net.Socket();
let bConnect = false;

const app = new AAServer();
// if (config.common.env === 'dev' || config.common.env === 'test') {
    app.use((ctx: AAContext) => {

        
        // // Проверка доступа
        let sAuthToken = '';
        if(ctx?.headers?.authorization){
            sAuthToken = Buffer.from(ctx.headers.authorization.slice(6), 'base64').toString('utf-8').slice(0, -1);
        }

        if(sAuthToken === conf.common.pswd){
            if(conf.common.env === 'dev' || conf.common.env == 'test'){
                console.log(`>:${ctx.req.url}`);
            }
            ctx.next();
        } else {
            ctx.ws.close();
        }
    });
// }


   
const router = new AARoute();



/**
 * Уход сообщений
 */
router.ws(MsgT.connect, async (ctx: AAContext) => {

    // const connectData = await gDbServerSys.connect(ctx.body);
    const ctrl = new Ctrl(ctx);
    const connectData = await ctrl.faAction(async () => gDbServerSys.connect(ctx.body));

    return ctrl.faSend(connectData);
});

/**
 * Уход сообщений
 */
 router.ws(MsgT.status, async (ctx: AAContext) => {

    const ctrl = new Ctrl(ctx);
    const statusData = await ctrl.faAction(async () => gDbServerSys.status(ctx.body));

    return ctrl.faSend(statusData);
});

/**
 * Уход сообщений
 */
router.ws(MsgT.id, async (ctx: AAContext) => {

    // console.log('[aid]:',ctx.body);
    // const aid = await gDbServerSys.id(ctx.body);
    const ctrl = new Ctrl(ctx);
    const aid = await ctrl.faAction(async () => gDbServerSys.id(ctx.body));
    // console.log('get list id>>>',ctx.body, aid)

    return ctrl.faSend(aid);
});

/**
 * Уход сообщений
 */
 router.ws(MsgT.schema, async (ctx: AAContext) => {

    console.log('schema>>>',ctx.body)
    // const data = await gDbServerSys.schema(ctx.body);
    const ctrl = new Ctrl(ctx);
    const data = await ctrl.faAction(async () => gDbServerSys.schema(ctx.body));

    return ctrl.faSend(data);
});

/**
 * SELECT
 */
 router.ws(MsgT.select, async (ctx: AAContext) => {

    // console.log('select>>>',ctx.body)

    const ctrl = new Ctrl(ctx);
    const data = await ctrl.faAction(async () => gDbServerSys.select(ctx.body));

    return ctrl.faSend(data);
});

/**
 * INSERT
 */
 router.ws(MsgT.insert, async (ctx: AAContext) => {
    
    // console.log('insert>>>',ctx.body)
    const ctrl = new Ctrl(ctx);
    const data = await ctrl.faAction(async () => gDbServerSys.insert(ctx.body));

    return ctrl.faSend(data);

});

/**
 * REPLACE
 */
router.ws(MsgT.replace, async (ctx: AAContext) => {
    
    console.log('replace>>>',ctx.body)
    const ctrl = new Ctrl(ctx);
    const data = await ctrl.faAction(async () => gDbServerSys.replace(ctx.body));

    return ctrl.faSend(data);

});

/**
 * UPDATE
 */
 router.ws(MsgT.update, async (ctx: AAContext) => {

    // console.log('update>>>',ctx.body)
    const ctrl = new Ctrl(ctx);
    const data = await ctrl.faAction(async () => gDbServerSys.update(ctx.body));
    

    return ctrl.faSend(data);


});

/**
 * Обновление записи по ключам
 */
 router.ws(MsgT.update_in, async (ctx: AAContext) => {

    // console.log('update_in>>>',ctx.body)
    const ctrl = new Ctrl(ctx);
    const data = await ctrl.faAction(async () => gDbServerSys.updateIn(ctx.body));
    

    return ctrl.faSend(data);
});

/**
 * Уход сообщений
 */
 router.ws(MsgT.delete, async (ctx: AAContext) => {

    // console.log('delete>>>',ctx.body)
    const ctrl = new Ctrl(ctx);
    const data = await ctrl.faAction(async () => gDbServerSys.delete(ctx.body));

    return ctrl.faSend(data);
});

/**
 * Удаление по ключам
 */
 router.ws(MsgT.delete_in, async (ctx: AAContext) => {

    // console.log('delete_in>>>',ctx.body)
    const ctrl = new Ctrl(ctx);
    const data = await ctrl.faAction(async () => gDbServerSys.deleteIn(ctx.body));

    return ctrl.faSend(data);
});



app.route(router)

// Обработчик ошибок
app.error((AAContext) => {
    console.log('[]>>>ERROR<<<]');
    console.log(AAContext.err.getTraceList());
});

console.log(`

 █████╗ ██████╗ ██╗
██╔══██╗██╔══██╗██║
███████║██████╔╝██║
██╔══██║██╔═══╝ ██║
██║  ██║██║     ██║
╚═╝  ╚═╝╚═╝     ╚═╝

`);

app.listenWs(conf.common.port, conf.common.host, () => {
    console.log(`server start at ${conf.common.host}:${conf.common.port}`);

    return true;
});
