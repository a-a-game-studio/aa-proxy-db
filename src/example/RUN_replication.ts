
import  knex from 'knex';

import * as conf from '../Config/MainConfig';

const db = knex({ // Knex mysql
    client: "mysql2"
})


import { mWait } from "../Helper/WaitH";
import { DbReplicationSys } from '../System/DbReplicationSys';
const gDbServerSys = new DbReplicationSys();


async function run(){

    for (let i = 0; i < 200; i++) {
        await gDbServerSys.dbReplication();
        
    }

    await mWait(2000);

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

