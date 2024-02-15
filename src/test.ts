
import { Knex } from 'knex';
import { dbMaster, dbProxy, adb } from './System/DBConnect';


// const sqlBuilder = dbMaster({i:'item'}).select('i.id').toQuery().replace(/`/g,'')
// // console.time('t')
// // for (let i = 0; i < 1000; i++) {
    
//     const aMatchJoin = sql.match(/^select\s+([a-z0-9]+\.id)\s+as?\s+([a-z0-9]+)\s+from\s+([a-z0-9]+)\s+as?\s+([a-z0-9]+)\s+left|join|right/);
// // }
// // console.timeEnd('t')
// const aMatch2 = sqlBuilder.match(/^select\s+([a-z0-9]\.id)\s+from\s+([a-z0-9]+)/);

// console.log('sqlBuilder>>>', sqlBuilder)


// const sql = `select it.id as id from item as i left join item_ex ie ON ie.item_id = i.id where  id > 0`
// const aMatchSimple = sql.match(/^select\s+([a-z0-9]+\.[a-z0-9]+)\s+as\s+([a-z0-9]+)\s+from\s+([a-z0-9]+)\s+as\s+([a-z0-9]+)\s+(\bleft\b|\bjoin\b|\bright\b)/);
// console.log('aMatch1>>>',aMatchSimple);

// console.log('aMatch2>>>',aMatch2);

// import  knex, { Knex } from 'knex';
import { mDateValue, mFormatDateTime } from './Helper/DateTimeH';

// const vKnext = knex({ // Knex mysql
//     client: "mysql2"
// })

// console.log(vKnext({i:'item'}).select('i.id').toQuery())

// const q:Knex.Raw = dbMaster.raw('SHOW TABLES')

async function run(){
    // console.log(dbMaster('test').insert([{id:1, text:'-------'},{id:2, text:'---1----'}],).onConflict().ignore().toString());
    // console.log(a);

    /** Интервал записи данных в бд */
// const intervalDb = setInterval(async () => {
    
//     // console.log('>>>INTERVAL DB EXE',  );
//     if(parseInt(String(Date.now() / 1000)) % 30 == 0){
//         console.log('>>>INTERVAL DB EXE', Date.now() / 1000)
//     }
// },1000)


    // try {
    // await dbMaster.raw(`
    
    
    // `);
    // } catch(e){
    //     console.log('ERROR>>>',e);
    // }

    // console.log(mFormatDateTime());

    console.log('====END====');
}

run();


