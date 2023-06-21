
import { AAContext, AARoute, AAServer } from '@a-a-game-studio/aa-server';


import { faSendRouter as faSend } from './System/ResponseSys';

import { QueryContextI, MsgT } from './interface/CommonI';
import { DbServerSys } from './System/DbServerSys';
import * as conf from './Config/MainConfig';

let cntConnect = 0;

const gDbServerSys = new DbServerSys();

gDbServerSys.dbInit();

/** Интервал записи данных в бд */
const intervalDb = setInterval(async () => {
    await gDbServerSys.dbSave();
    // await gDbServerSys.dbReplication();
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

    const connectData = await gDbServerSys.connect(ctx.body);

    return faSend(ctx, connectData);
});

/**
 * Уход сообщений
 */
router.ws(MsgT.id, async (ctx: AAContext) => {

    console.log('[aid]:',ctx.body);
    const aid = await gDbServerSys.id(ctx.body);
    console.log('get list id>>>',ctx.body, aid)

    return faSend(ctx, aid);
});

/**
 * Уход сообщений
 */
 router.ws(MsgT.schema, async (ctx: AAContext) => {

    console.log('schema>>>',ctx.body)
    const data = await gDbServerSys.schema(ctx.body);

    return faSend(ctx, data);
});

/**
 * Уход сообщений
 */
 router.ws(MsgT.select, async (ctx: AAContext) => {

    console.log('select>>>',ctx.body)
    const data = await gDbServerSys.select(ctx.body);

    return faSend(ctx, data);
});

/**
 * Уход сообщений
 */
 router.ws(MsgT.insert, async (ctx: AAContext) => {

    console.log('insert>>>',ctx.body)
    const data = await gDbServerSys.insert(ctx.body);

    return faSend(ctx, data);


});

/**
 * Уход сообщений
 */
 router.ws(MsgT.update, async (ctx: AAContext) => {

    console.log('update>>>',ctx.body)
    const data = await gDbServerSys.update(ctx.body);
    

    return faSend(ctx, data);


});

/**
 * Обновление записи по ключам
 */
 router.ws(MsgT.update_in, async (ctx: AAContext) => {

    console.log('update_in>>>',ctx.body)
    const data = await gDbServerSys.updateIn(ctx.body);
    

    return faSend(ctx, data);


});

/**
 * Уход сообщений
 */
 router.ws(MsgT.delete, async (ctx: AAContext) => {

    console.log('delete>>>',ctx.body)
    const data = await gDbServerSys.delete(ctx.body);

    return faSend(ctx, data);
});

/**
 * Удаление по ключам
 */
 router.ws(MsgT.delete_in, async (ctx: AAContext) => {

    console.log('delete_in>>>',ctx.body)
    const data = await gDbServerSys.deleteIn(ctx.body);

    return faSend(ctx, data);
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
