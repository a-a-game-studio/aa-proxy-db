
import { dbMaster, dbProxy, adb } from './System/DBConnect';

const sql = 'select it.id as id from item as i where id > 0'
const sqlBuilder = dbMaster({i:'item'}).select('i.id').toQuery().replace(/`/g,'')
// console.time('t')
// for (let i = 0; i < 1000; i++) {
    const aMatchSimple = sql.match(/^select\s+([a-z0-9]+\.id)\s+as?\s+([a-z0-9]+)\s+from\s+([a-z0-9]+)\s+where/);
    const aMatchJoin = sql.match(/^select\s+([a-z0-9]+\.id)\s+as?\s+([a-z0-9]+)\s+from\s+([a-z0-9]+)\s+as?\s+([a-z0-9]+)\s+left|join|right/);
// }
// console.timeEnd('t')
const aMatch2 = sqlBuilder.match(/^select\s+([a-z0-9]\.id)\s+from\s+([a-z0-9]+)/);

console.log('sqlBuilder>>>', sqlBuilder)
console.log('aMatch1>>>',aMatchSimple);
console.log('aMatch2>>>',aMatch2);
