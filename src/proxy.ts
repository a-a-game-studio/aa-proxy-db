
import net from 'net';

var LOCAL_PORT  = 3000;
var REMOTE_PORT = 3306;
var REMOTE_ADDR = "127.0.0.1";

let gMsg = '';

let cntConnect = 0;
let iQRSlave = 0;
let iQRMaster = 0;

console.log(Buffer.from('select'))

const gComQuery = 3;
const gComStmtPrepare = 22;

import { dbProxy2 } from "./System/DBConnect";

// async function run (){
//     await dbProxy2.raw('SHOW TABLES');
// }
// run()



// let remoteSocket2 = new net.Socket();
// var server2 = null;
// {
//     server2 = net.createServer(function (clientSocket:net.Socket) {
//         console.log('CONNECT CLIENT ',cntConnect)

//         cntConnect++;

//         console.log(clientSocket.eventNames());
//         clientSocket.on('data', function (msg) {

//             console.log('==============================');
//             console.log('>>>>HEAD<<<<');
//             console.log('>>>>',Number(msg[0]|msg[1]|msg[2]), Number(msg[3]), Number(msg[4]));
//             console.log('==============================');

//             const iBodyLen = Number(msg[0]|msg[1]|msg[2])

//             const abMsg = Buffer.alloc(iBodyLen);
//             msg.copy(abMsg, 0, 5)
//             const sMsg = abMsg.toString();
            
//             const sQueryStart = sMsg.substr(0, 50).toLowerCase();
//             const iSelectPos = sQueryStart.indexOf('select');
//             const iFirstPos = sQueryStart.indexOf('first');
//             const iPluckPos = sQueryStart.indexOf('pluck');
//             const iInsertPos = sQueryStart.indexOf('insert');
//             const iDeletePos = sQueryStart.indexOf('delete');
//             const iUpdatePos = sQueryStart.indexOf('update');

//             const bRead = (iSelectPos >= 0 || iFirstPos >= 0 || iPluckPos >= 0);
//             const bWrite = (iInsertPos >= 0 || iDeletePos >= 0 || iUpdatePos >= 0);
//             if (bRead && !bWrite){
//                 iQRSlave++;

//                 console.log('<< From client to proxy SLAVE [',iQRSlave,'] DATA>>>[', sMsg, ']');
//             } else {
//                 iQRMaster++;

//                 console.log('<< From client to proxy MASTER [',iQRMaster,'] DATA>>>[', sMsg, ']');
//             }

            

//             remoteSocket2.write(msg);
            
//         });

//         clientSocket.on("End", function (data:any) {
//             console.log('<< End client to proxy', data.toString());
//             remoteSocket2.end();
//         });

//         // ====================================
        
//         remoteSocket2.connect(REMOTE_PORT, REMOTE_ADDR, function () {
//             console.log('>> From proxy to remote CONNECT');

//         });

//         remoteSocket2.on("data", function (data:any) {
//             // console.log('<< From remote to proxy DATA>>>', data.toString());
//             clientSocket.write(data);
//             // console.log('>> From proxy to client DATA>>>', data.toString());
//         });

//         remoteSocket2.on("End", function (data:any) {
//             console.log('<< End remote to proxy', data.toString());
//             clientSocket.end();
//         });

        

        

//         // fSync(socket, serviceSocket, '');

//         console.log(clientSocket.bytesRead)

//         // socket.end('goodbye\n');
//     });

//     server2.listen(3001);
//     console.log("TCP2 server accepting connection on port: " + 3001);

// }


// =============================================================


var server = net.createServer(function (clientSocket:net.Socket) {
    console.log('CONNECT CLIENT ',cntConnect)
    var remoteSocket = new net.Socket();

    cntConnect++;

    console.log(clientSocket.eventNames());
    clientSocket.on('data', function (msg) {

        console.log('==============================');
        console.log('>>>>HEAD<<<<');
        console.log('>>>>',Number(msg[0]|msg[1]|msg[2]), Number(msg[3]), Number(msg[4]));
        console.log('==============================');

        const iBodyLen = Number(msg[0]|msg[1]|msg[2])

        const abMsg = Buffer.alloc(iBodyLen);
        msg.copy(abMsg, 0, 5)
        const sMsg = abMsg.toString();
        
        const sQueryStart = sMsg.substr(0, 50).toLowerCase();
        const iSelectPos = sQueryStart.indexOf('select');
        const iFirstPos = sQueryStart.indexOf('first');
        const iPluckPos = sQueryStart.indexOf('pluck');
        const iInsertPos = sQueryStart.indexOf('insert');
        const iDeletePos = sQueryStart.indexOf('delete');
        const iUpdatePos = sQueryStart.indexOf('update');

        const bRead = (iSelectPos >= 0 || iFirstPos >= 0 || iPluckPos >= 0);
        const bWrite = (iInsertPos >= 0 || iDeletePos >= 0 || iUpdatePos >= 0);
        if (bRead && !bWrite){
            iQRSlave++;

            console.log('<< From client to proxy SLAVE [',iQRSlave,'] DATA>>>[', sMsg, ']');
        } else {
            iQRMaster++;

            console.log('<< From client to proxy MASTER [',iQRMaster,'] DATA>>>[', sMsg, ']');
        }

        

        remoteSocket.write(msg);
        
    });

    clientSocket.on("End", function (data:any) {
        console.log('<< End client to proxy', data.toString());
        remoteSocket.end();
    });

    // ====================================
    
    remoteSocket.connect(REMOTE_PORT, REMOTE_ADDR, function () {
        console.log('>> From proxy to remote CONNECT');

    });

    remoteSocket.on("data", function (data:any) {
        // console.log('<< From remote to proxy DATA>>>', data.toString());
        clientSocket.write(data);
        // console.log('>> From proxy to client DATA>>>', data.toString());
    });

    remoteSocket.on("End", function (data:any) {
        console.log('<< End remote to proxy', data.toString());
        clientSocket.end();
    });

    

    

    // fSync(socket, serviceSocket, '');

    console.log(clientSocket.bytesRead)

    // socket.end('goodbye\n');
});

        
        

server.listen(LOCAL_PORT);
console.log("TCP server accepting connection on port: " + LOCAL_PORT);


