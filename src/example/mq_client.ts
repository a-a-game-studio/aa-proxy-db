
// import { db } from "../System/DBConnect";
import { v4 as uuid4 } from 'uuid';
import { mRandomInteger } from "../Helper/NumberH";



import { mWait } from "../Helper/WaitH";
import { DbClientSys } from "../System/DbClientSys";

// CORE API
const mqClientSys = new DbClientSys({
    baseURL: 'ws://127.0.0.1:8080',
    nameApp: 'test_client'
})

async function run(){

    // mqClientSys.connect('test', null);

    // for (let c = 0; c < 3; c++) {

        const aMsg = []
        for (let i = 0; i < 2; i++) {
            const sMsg = '['+i+'] СообщениЕ ['+i+']';
    
            aMsg.push({text:sMsg});
            if(i % 1000 == 0){
                process.stdout.write('.');
            }
        }
        
        const row = await mqClientSys.insert('test', aMsg);

        console.log('[run]:',':',row);
    // }

    await mWait(5000);

    console.log('=========================');
    console.log('END');
    console.log('=========================');
    process.exit(0)
}
// for (let i = 0; i < 20; i++) {
run().catch((error) => {
    console.log('>>>ERROR>>>',error);
    process.exit(1)
});

// }

