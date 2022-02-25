
import { dbProxy } from "./System/DBConnect";
import { v4 as uuid4 } from 'uuid';
import { mRandomInteger } from "./Helper/NumberH";

async function run(){


    await dbProxy('user').insert({name:uuid4(),rand:mRandomInteger(0,10)});

    const aDamage =  await dbProxy('user').select('*').where('id', '>=', 1).limit(2);

    const aDamage1 =  await dbProxy('user').select('*').limit(2);

    const aDamage2 =  await dbProxy('user').select('*').limit(2);

    const aDamag3 =  await dbProxy.raw('SELECT * FROM user WHERE rand >= :rand LIMIT 2', {rand:1});

    // console.log(dbLocal.client);

    console.log('user>>>',aDamage);

    console.log('=========================');
    console.log('END');
    console.log('=========================');
    process.exit(0)
}

run().catch((error) => {
    console.log('>>>ERROR>>>',error);
    process.exit(1)
});