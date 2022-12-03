
import { AAContext, AARoute, AAServer } from '@a-a-game-studio/aa-server';


import { faSendRouter as faSend } from './System/ResponseSys';

import { MsgContextI, MsgT } from './interface/CommonI';
import { common } from './Config/MainConfig';
import { DbServerSys } from './System/DbServerSys';

let cntConnect = 0;

const gDbServerSys = new DbServerSys();

gDbServerSys.dbInit();



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
    return faSend(ctx, null);
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
 router.ws(MsgT.select, async (ctx: AAContext) => {

    // const data = gMqServerSys.get(ctx.body);
    // console.log('ask>>>',ctx.body, data)

    return faSend(ctx, {});
});

/**
 * Уход сообщений
 */
 router.ws(MsgT.insert, async (ctx: AAContext) => {

    console.log('insert>>>',ctx.body)
    const data = gDbServerSys.insert(ctx.body);
    

    return faSend(ctx, {});


});

/**
 * Уход сообщений
 */
 router.ws(MsgT.update, async (ctx: AAContext) => {

    const data = gDbServerSys.update(ctx.body);
    console.log('ask>>>',ctx.body, data)

    return faSend(ctx, {});


});

/**
 * Уход сообщений
 */
 router.ws(MsgT.delete, async (ctx: AAContext) => {

    // const data = gMqServerSys.get(ctx.body);
    // console.log('ask>>>',ctx.body, data)

    return faSend(ctx, {});
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

app.listenWs(common.port, common.host, () => {
    console.log(`server start at ${common.host}:${common.port}`);

    return true;
});
