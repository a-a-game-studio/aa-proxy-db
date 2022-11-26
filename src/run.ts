
import { AAContext, AARoute, AAServer } from '@a-a-game-studio/aa-server';


// import { MqServerSys } from './System/MqServerSys';
import { faSendRouter as faSend } from './System/ResponseSys';

import { MsgContextI, MsgT } from './interface/CommonI';
import { common } from './Config/MainConfig';

let cntConnect = 0;

// const gMqServerSys = new MqServerSys();

// gMqServerSys.dbInit();



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
router.ws(MsgT.id, async (ctx: AAContext) => {

    // const data = gMqServerSys.get(ctx.body);
    // console.log('ask>>>',ctx.body, data)

    return faSend(ctx, {});


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

    // const data = gMqServerSys.get(ctx.body);
    // console.log('ask>>>',ctx.body, data)

    return faSend(ctx, {});


});

/**
 * Уход сообщений
 */
 router.ws(MsgT.insert, async (ctx: AAContext) => {

    // const data = gMqServerSys.get(ctx.body);
    // console.log('ask>>>',ctx.body, data)

    return faSend(ctx, {});


});

/**
 * Уход сообщений
 */
 router.ws(MsgT.update, async (ctx: AAContext) => {

    // const data = gMqServerSys.get(ctx.body);
    // console.log('ask>>>',ctx.body, data)

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
