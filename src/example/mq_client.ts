
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

    for (let i = 0; i < 10000; i++) {
        const sMsg = '['+i+'] СообщениЕ ['+i+']';

        mqClientSys.send('test', {text:sMsg})

        if(i % 1000 == 0){
            process.stdout.write('.');
        }
        
    }

    await mWait(1000);


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

