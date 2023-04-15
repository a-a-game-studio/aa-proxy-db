
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
        console.log(`>:${ctx.req.url}`);
        ctx.next();
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
 * Уход сообщений
 */
 router.ws(MsgT.delete, async (ctx: AAContext) => {

    console.log('delete>>>',ctx.body)
    const data = await gDbServerSys.delete(ctx.body);

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
