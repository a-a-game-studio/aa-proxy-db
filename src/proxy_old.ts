
// import net from 'net';

// var LOCAL_PORT  = 3000;
// var REMOTE_PORT = 3306;
// var REMOTE_ADDR = "127.0.0.1";

// let gMsg = '';

// let cntConnect = 0;
// let iQRSlave = 0;
// let iQRMaster = 0;

// console.log(Buffer.from('select'))

// const gComQuery = 3;
// const gComStmtPrepare = 22;

// import { dbProxy2 } from "./System/DBConnect";





// // async function run (){
// //     await dbProxy2.raw('SHOW TABLES');
// //     await dbProxy2('user').select('*').limit(2);
// // }
// // run()

// // let sSrvProtocol = '';
// // let sSrvAuth = '';



// // {
// //     var server2 = net.createServer(function (clientSocket:net.Socket) {
// //         console.log('CONNECT CLIENT ',cntConnect)
// //         let remoteSocket2 = new net.Socket();
// //         cntConnect++;

// //         console.log(clientSocket.eventNames());
// //         clientSocket.on('data', function (msg) {

// //             console.log('==============================');
// //             console.log('>>>>HEAD<<<<');
// //             console.log('>>>>',Number(msg[0]|msg[1]|msg[2]), Number(msg[3]), Number(msg[4]));
// //             console.log('==============================');

// //             const iBodyLen = Number(msg[0]|msg[1]|msg[2])

// //             const abMsg = Buffer.alloc(iBodyLen);
// //             msg.copy(abMsg, 0, 5)
// //             const sMsg = abMsg.toString();
            
// //             const sQueryStart = sMsg.substr(0, 50).toLowerCase();
// //             const iSelectPos = sQueryStart.indexOf('select');
// //             const iFirstPos = sQueryStart.indexOf('first');
// //             const iPluckPos = sQueryStart.indexOf('pluck');
// //             const iInsertPos = sQueryStart.indexOf('insert');
// //             const iDeletePos = sQueryStart.indexOf('delete');
// //             const iUpdatePos = sQueryStart.indexOf('update');

// //             const bRead = (iSelectPos >= 0 || iFirstPos >= 0 || iPluckPos >= 0);
// //             const bWrite = (iInsertPos >= 0 || iDeletePos >= 0 || iUpdatePos >= 0);
// //             if (bRead && !bWrite){
// //                 iQRSlave++;

// //                 console.log('<< From client to proxy SLAVE [',iQRSlave,'] DATA>>>[', sMsg, ']');
// //             } else {
// //                 iQRMaster++;

// //                 console.log('<< From client to proxy MASTER [',iQRMaster,'] DATA>>>[', sMsg, ']');
// //             }

            

// //             remoteSocket2.write(msg);
            
// //         });

// //         clientSocket.on("End", function (data:any) {
// //             console.log('<< End client to proxy', data.toString());
            
// //             remoteSocket2.end();
// //         });

// //         // ====================================
        
// //         remoteSocket2.connect(REMOTE_PORT, REMOTE_ADDR, function () {
// //             console.log('>> From proxy to remote CONNECT');

// //         });

// //         remoteSocket2.on("data", function (data:any) {

// //             if(cntConnect == 1){
// //                 sSrvProtocol = data;
// //                 console.log('|>>',data.toString());
// //             }
// //             if(cntConnect == 2){
// //                 sSrvAuth = data;
// //                 console.log('|>>',data.toString());
// //             }
// //             // console.log('<< From remote to proxy DATA>>>', data.toString());
// //             clientSocket.write(data);
// //             // console.log('>> From proxy to client DATA>>>', data.toString());
// //         });

// //         remoteSocket2.on("End", function (data:any) {
// //             console.log('<< End remote to proxy', data.toString());
// //             clientSocket.end();
// //         });

        

        

// //         // fSync(socket, serviceSocket, '');

// //         console.log(clientSocket.bytesRead)

// //         // socket.end('goodbye\n');
// //     });

// //     server2.listen(3001);
// //     console.log("TCP2 server accepting connection on port: " + 3001);

// // }


// // =============================================================
// // var remoteSocket = new net.Socket();
// let bConnect = false;


// var server = net.createServer(function (clientSocket:net.Socket) {
//     console.log('==============================');
//     console.log('CONNECT CLIENT ',cntConnect)
//     console.log('==============================');
//     var remoteSocket = new net.Socket();

//     let iConnect = 0;

    


//     console.log(clientSocket.eventNames());
//     clientSocket.on('data', function (msg) {

//         iConnect++;

//         console.log('==============================');
//         console.log('>>>>HEAD<<<<', iConnect);
//         console.log('>>>>',Number(msg[0]|msg[1]|msg[2]), Number(msg[3]), Number(msg[4]));
//         console.log('>>>>BODY<<<<');
//         console.log('>>>>[', msg.toString(), ']');
//         console.log('==============================');

//         const iBodyLen = Number(msg[0]|msg[1]|msg[2])

//         const abMsg = Buffer.alloc(iBodyLen);
//         msg.copy(abMsg, 0, 5)
//         const sMsg = abMsg.toString();
        
//         const sQueryStart = sMsg.substr(0, 50).toLowerCase();
//         const iSelectPos = sQueryStart.indexOf('select');
//         const iFirstPos = sQueryStart.indexOf('first');
//         const iPluckPos = sQueryStart.indexOf('pluck');
//         const iInsertPos = sQueryStart.indexOf('insert');
//         const iDeletePos = sQueryStart.indexOf('delete');
//         const iUpdatePos = sQueryStart.indexOf('update');

//         const bRead = (iSelectPos >= 0 || iFirstPos >= 0 || iPluckPos >= 0);
//         const bWrite = (iInsertPos >= 0 || iDeletePos >= 0 || iUpdatePos >= 0);
//         if (bRead && !bWrite){
//             iQRSlave++;

//             // console.log('<< From client to proxy SLAVE [',iQRSlave,'] DATA>>>[', sMsg, ']');
//         } else {
//             iQRMaster++;

//             // console.log('<< From client to proxy MASTER [',iQRMaster,'] DATA>>>[', msg, ']');
//         }

//         if(iConnect == 2){
//             remoteSocket.off('data', () => { console.log('connect close hard')})
//         }


//         if(iConnect > 1){

//             console.log('****>2***')

//             let ab='';

//             '0100000101330000020364656611746573745f70726f78795f6'
//             '0100000101370000020364656611746573745f70726f78795f6'


//             // загаловок секции количество байт

//             let ab1 = ''
//             // загаловок
//             ab1+='01000001' // заголовок секции кол колонки 
//             ab1+='03' // количество колонок
            
//             // Колонка ID
//             ab1+='31000002' // заголовок секции колонки 
//             ab1+='03646566' // 3 'def'
//             ab1+='11746573745F70726F78795F6D6173746572' // 17 'test_proxy_master'
//             ab1+='0161' // 4 'user' - таблица
//             ab1+='057573657231' // 4 'user' - таблица
//             ab1+='026964' // 2 id - колонка
//             ab1+='026964' // 2 id - колонка
  
//             ab1+='0c' // фиксированная длинна колонки
//             ab1+='3f' // 63 - charset binary
//             ab1+='000b' // 11 длинна колонки int
//             ab1+='000000000000000000' // Конец колонки primary int
            

//             // ========================================
//             // Колонка ID1
//             ab1+='36000003' //  заголовок секции колонки 
//             ab1+='03646566' // 3 'def'
//             ab1+='11746573745F70726F78795F6D6173746572' // 17 'test_proxy_master'
//             ab1+='0161' // 4 'user' - таблица
//             ab1+='0a616464726573735F6964' // 4 'user_setting' - таблица
//             ab1+='026931'
//             ab1+='026964'
//             ab1+='0c' // фиксированная длинна колонки
//             ab1+='3f' // 63 - charset binary
//             ab1+='000b' // 11 длинна колонки int
//             ab1+='000000000000000000' // Конец колонки primary int

//             // ========================================
//             // Колонка city
            
//             ab1+='38000004' //  заголовок секции колонки 
//             ab1+='03646566' // 3 'def'
//             ab1+='11746573745F70726F78795F6D6173746572' // 17 'test_proxy_master'
//             ab1+='0161' // 4 'user' - таблица
//             ab1+='0a616464726573735F6964' // 4 'user_setting' - таблица
//             ab1+='026161'
//             ab1+='0463697479'
//             ab1+='0c' // фиксированная длинна колонки
//             ab1+='3f' // 63 - charset binary
//             ab1+='000a' // 10 длинна колонки int
//             ab1+='000000000000000000' // Конец колонки primary int
            

//             console.log('================')
//             console.log('>>>ab1>>>',ab1.length/2)
//             console.log('================')
//             ab+=ab1;
//             // ab+='00000003034200000005000003' // Конец колонки primary int
            
            
//             ab+='05000005' //  заголовок секции
//             ab+='fe00002200' // Конец секции (2200 - если есть строки)

//             ab+='16010006' // заголовок секции (16 - в текущем разряде, 01 - количество разрядов)

//             ab+='0132'
//             ab+='0132'

//             // КОДИРОВАНИЕ СТРОКИ БОЛЬШЕ 256 СИМВОЛОВ - fc0f01
//             // fc - строка > 255 символов 
//             // 0f - число в последнем разряде (15)
//             // 01 - число разряды (255)
//             ab+='fc0f0173737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373'

//             ab+='05000007' // заголовок секции
//             ab+='fe00002200' // Конец секции

//             // 0100000102310000020364656611746573745f70726f78795f6d617374657201610575736572310269640269640c3f000b000000000000000000360000030364656611746573745f70726f78795f6d617374657201610a616464726573735f69640269310269640c3f000b000000000000000000380000040364656611746573745f70726f78795f6d617374657201610a616464726573735f696402616104636974790c3f000a00000000000000000005000005fe000022000600000601320132013205000007fe00002200
//             // 0100000103310000020364656611746573745f70726f78795f6d617374657201610575736572310269640269640c3f000b000000000000000000360000030364656611746573745f70726f78795f6d617374657201610a616464726573735f69640269310269640c3f000b000000000000000000380000040364656611746573745f70726f78795f6d617374657201610a616464726573735f696402616104636974790c3f000a00000000000000000005000005fe000022001601000601320132fc0f017373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737305000007fe00002200
//             // 0100000103310000020364656611746573745f70726f78795f6d617374657201610575736572310269640269640c3f000b000000000000000000360000030364656611746573745f70726f78795f6d617374657201610a616464726573735f69640269310269640c3f000b000000000000000000380000040364656611746573745f70726f78795f6d617374657201610a616464726573735f696402616104636974790c3f000a00000000000000000005000005fe000022001601000601320132fc0f017373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737305000007fe00002200
//             // 0100000103310000020364656611746573745f70726f78795f6d617374657201610575736572310269640269640c3f000b000000030100000000410000030364656611746573745f70726f78795f6d61737465720275730c757365725f73657474696e670269310a616464726573735f69640c3f000a0000000300000000003b0000040364656611746573745f70726f78795f6d61737465720275730c757365725f73657474696e6702616104636974790c210070170000fd000000000005000005fe000022000a01000601320133fc03017373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737305000007fe00002200
//             // 0100000103310000020364656611746573745f70726f78795f6d617374657201610575736572310269640269640c3f000b000000030100000000410000030364656611746573745f70726f78795f6d61737465720275730c757365725f73657474696e670269310a616464726573735f69640c3f000a0000000300000000003b0000040364656611746573745f70726f78795f6d61737465720275730c757365725f73657474696e6702616104636974790c210070170000fd000000000005000005fe000022000b01000601320133fc0401737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737305000007fe00002200
//             // 0100000103310000020364656611746573745f70726f78795f6d617374657201610575736572310269640269640c3f000b000000030100000000410000030364656611746573745f70726f78795f6d61737465720275730c757365725f73657474696e670269310a616464726573735f69640c3f000a0000000300000000003b0000040364656611746573745f70726f78795f6d61737465720275730c757365725f73657474696e6702616104636974790c210070170000fd000000000005000005fe000022001303000601320133fc0c0373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737305000007fe00002200

//             console.log('===========>>>', Buffer.from(ab, 'hex').toString('hex'))

//             clientSocket.write(Buffer.from(ab, 'hex'));

//             // загаловок
//             '01000001' // загаловок
//             '03' // количество колонок
//             '33000002' // загаловок

//             // Колонка ID
//             '03-646566' // 3 'def'
//             '11-746573745F70726F78795F6D6173746572' // 17 'test_proxy_master'
//             '04-75736572' // 4 'user' - таблица
//             '04-75736572' // 4 'user' - таблица
//             '02-6964' // 2 id - колонка
//             '02-6964' // 2 id - колонка
//             '0c' // фиксированная длинна колонки
//             '3f' // 63 - charset binary
//             '000b' // 11 длинна колонки int
//             '00000003034200000037000003' // Конец колонки primary int

            

//             // Колонка NAME
//             '03-646566' // 3 'def'
//             '11-746573745F70726F78795F6D6173746572' // 17 'test_proxy_master'
//             '04-75736572' // 4 'user' - таблица
//             '04-75736572' // 4 'user' - таблица
//             '04-6E616D65' // 4 'name' - колонка
//             '04-6E616D65' // 4 'name' - колонка
//             '0c' // фиксированная длинна колонки
//             '21' // 33 - utf8_general_ci
//             '0096' // 50 длинна колонки varchar(50)
//             '000000fd000000000037000004' // Конец колонки name varchar(50)
            
//             // Колонка RAND
//             '03-646566' // 3 'def'
//             '11-746573745F70726F78795F6D6173746572' // 17 'test_proxy_master'
//             '04-75736572' // 4 'user' - таблица
//             '04-75736572' // 4 'user' - таблица
//             '04-72616E64' // 4 'rand' - колонка
//             '04-72616E64' // 4 'rand' - колонка
//             '0c' // фиксированная длинна колонки
//             '3f' // 63 - charset binary
//             '0014' // 11 длинна колонки bigint
//             '00000008084000000005000005' // Конец колонки rand
            
            
//             'fe00000200' // Конец секции

//             '0800' // ???

//             // Данные 3-и колонки 2-е строки
//             '0006' // Количестов данных в строках

//             '01-32' // 2
//             '03-616161' // 'aaa'
//             '01-32' // 2

//             '06000007' // Разделитель строки

//             '01-37' // 7
//             '01-33' // 3
//             '01-34' // 4

//             '05000008' // хвост
            
//             'fe00000200' // конец секции


//             /*
//             // Кодировки
//             8	0x08	latin1_swedish_ci
//             33	0x21	utf8_general_ci
//             63	0x3f	binary
//             */

//             // clientSocket.write(Buffer.from([0,9,4,3]));
//         }

//         if(iConnect <= 2){
//             remoteSocket.write(msg);
//         }
        
//     });

    

    

//     // clientSocket.on("End", (data:any) => {
//     //     console.log('<< End client to proxy', data.toString());

//     //     if(iConnect){
//     //         remoteSocket.end();
//     //     }
//     // });

//     // ====================================


//         remoteSocket.connect(REMOTE_PORT, REMOTE_ADDR, () => {
//             console.log('>> From proxy to remote CONNECT');
//         });

//     //     bConnect = true;
    
    
//     remoteSocket.on("data", (data:Buffer) => {
//         console.log('')
//         console.log('==================================')
//         console.log('----------------------------------')
//         console.log('data_outb>>>',Number(data[4]));
//         console.log('----------------------------------')
//         console.log('data_outb>>>',data.toString('ascii'));
//         console.log('----------------------------------')
//         console.log('data_outb>>>',data.toString('hex'));
//         console.log('----------------------------------')
//         console.log('data_outb>>>',data.slice(44,data.length));
//         console.log('----------------------------------')
//         console.log('data_outb>>>',data.slice(44,data.length).toString('ascii'));
//         console.log('----------------------------------')
//         console.log('data_outs>>>',data.slice(44,data.length).toString());
//         console.log('==================================')
//         // console.log('<< From remote to proxy DATA>>>', data.toString());
//         clientSocket.write(data);
//         // console.log('>> From proxy to client DATA>>>', data.toString());
//     });


//     // remoteSocket.on("End", (data:any) => {
//     //     console.log('<< End remote to proxy', data.toString());
//     //     clientSocket.end();
//     // });


//     // console.log('----',sSrvProtocol.toString());
//     // clientSocket.write(Buffer.from([]))


    

//     // fSync(socket, serviceSocket, '');

//     // console.log(clientSocket.bytesRead)

//     // socket.end('goodbye\n');
// });

        
        

// server.listen(LOCAL_PORT);
// console.log("TCP server accepting connection on port: " + LOCAL_PORT);


