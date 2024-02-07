import { Knex } from "knex";
import _ from "lodash";
import { aCfDb } from "../Config/MainConfig";
import { adb, adbError, adbWait, dbProxy, gixDb, ixDbWaitTime } from "./DBConnect";

export class DbReplicationSys {

    

    /** Проверить репликацию */
    public async dbCheckReplication(){

        console.log('>>>dbCheckReplication>>>','OK:', adb.length, 'WAIT:',adbWait.length,'ERROR:',adbError.length);

        for (let i = 0; i < adbError.length; i++) {
            const dbError = adbError[i];
            const idMaxSchema = (await dbProxy('query')
                .max({id:'schema_id'}))[0]?.id || 0;
            
            let idMaxRepSchema = (await dbError('__replication__')
                .max({id:'schema_id'}))[0]?.id || 0;

            let idMaxRepProxy = (await dbProxy('query')
                .max({id:'id'}))[0]?.id || 0;

            let idMaxRepError = (await dbError('__replication__')
                .max({id:'id'}))[0]?.id || 0;

            console.log(idMaxSchema  + ' == ' + idMaxRepSchema + ' &&'  + idMaxRepProxy  + ' == ' +  idMaxRepError)
            if(idMaxSchema == idMaxRepSchema && idMaxRepProxy == idMaxRepError){
                
                console.log('<<<БД ПЕРЕВЕДЕНА В ОЖИДАНИЕ>>>')
                const vConnect = adbError[i].client.config.connection;
                ixDbWaitTime[vConnect.host+':'+vConnect.port+':'+vConnect.database] = new Date().valueOf();
                adbWait.push(adbError[i]);
                adbError.splice(i, 1);
            }
        }

    }

    /** Сохранить информацию по очереди */
    public async dbReplication(){
        const adb:Knex[] = [...adbError,...adbWait];
        
        for (let i = 0; i < adb.length; i++) {
            // const vCfDb = adb[i];

            // if( vCfDb.connection.database != 'test_proxy_master1'){
            //     console.log('Пропуск репликации тестирование - ', vCfDb.connection.database)
            //     continue;
            // }

            console.log('>>>dbReplication1>>>')

            const dbMaster = adb[i];

            try { // Проверка БД на доступность
                await dbMaster('__replication__').max({id:'id'});
            } catch (e){
                const vConnect = dbMaster?.client?.config?.connection;
                if(vConnect){
                    console.log('<<<ERROR>>>', vConnect.host+':'+vConnect.port+':'+vConnect.database,' - Соединение отсутствует');
                } else {
                    console.log('<<<ERROR>>>','adb[',i,']', ' == несуществует|undefined');
                }
                continue;
            }
      
            //================================================
            //================================================

            const idMaxSchema = (await dbProxy('query')
                .max({id:'schema_id'}))[0]?.id || 0;

            const idMinSchema = (await dbProxy('query')
                .max({id:'schema_id'}))[0]?.id || 0;
            
            let idMaxRepSchema = (await dbMaster('__replication__')
                .max({id:'schema_id'}))[0]?.id || 0;

            let idMaxRep = (await dbMaster('__replication__')
                .max({id:'id'}))[0]?.id || 0;

            if(idMaxRepSchema < idMinSchema){
                idMaxRepSchema = idMinSchema;
            }

            //================================================
            // МаxUpdateQuery
            //================================================
            
            
            //================================================
            //================================================

            let idSchema = idMaxRepSchema;

            // console.log('>>>dbReplication6>>>', 'idMaxQuery', idMaxInsertQuery)


            let cntQuery = 0;
            let cntQueryInsert = 0;
            let cntQueryDelete = 0;
            let cntQueryUpdate = 0;
            
            //================================================
            // МаxInsertQuery
            //================================================

            console.log('>>>dbReplication2_INSERT>>>', 'sync')

            const idMaxInsertQuery = (await dbProxy('query')
                .where({
                    cmd:'insert',
                    schema_id:idMaxRepSchema
                })
                .max({id:'id'}))[0]?.id || 0;

            // ================================================
            // INSERT
            // ================================================

            let idMaxRepInsertQuery = (await dbMaster('__replication__')
                .where({
                    cmd:'insert',
                    schema_id:idMaxRepSchema
                })
                .max({id:'id'}))[0]?.id || 0;

            if(!cntQuery && idMaxRepInsertQuery < idMaxInsertQuery){
                const aQueryInsert = (await dbProxy('query')
                    .where({
                        schema_id:idSchema,
                        cmd:'insert'
                    })
                    .where('id', '>', idMaxRepInsertQuery)
                    .select()
                    .limit(100)
                )

                // idMaxQueryInsert = _.max(aQueryInsert.map(el => el.id));
                // idMinQueryInsert = _.max(aQueryInsert.map(el => el.id));

                
                console.log('>>>dbReplication3_INSERT>>>', 'aQueryInsert', aQueryInsert.length)

                cntQuery+=aQueryInsert.length;
                cntQueryInsert = aQueryInsert.length;
                
                for (let i = 0; i < aQueryInsert.length; i++) {
                    

                    const vQueryInsert = aQueryInsert[i];

                    // console.log(vQueryInsert);

                    try {
                        await dbMaster.raw(vQueryInsert.data);
                        await dbMaster('__replication__').insert({
                            id:vQueryInsert.id,
                            schema_id:vQueryInsert.schema_id,
                            cmd:vQueryInsert.cmd
                        }).onConflict().merge();
                    } catch (e){
                        console.log('>>>ERROR>>>', e);
                    }
                    
                }

            }

            //================================================
            //================================================

            // ================================================
            // DELETE
            // ================================================

            //================================================
            // МаxDeleteQuery
            //================================================

            console.log('>>>dbReplication3_DELETE>>>', 'sync')

            const idMaxDeleteQuery = (await dbProxy('query')
                .where({
                    cmd:'delete',
                    schema_id:idMaxRepSchema
                })
                .max({id:'id'}))[0]?.id || 0;


            let idMaxRepDeleteQuery = (await dbMaster('__replication__')
                .where({
                    cmd:'delete',
                    schema_id:idMaxRepSchema
                })
                .max({id:'id'}))[0]?.id || 0;

            if(!cntQuery && idMaxRepDeleteQuery < idMaxDeleteQuery){
                const aQueryDelete = (await dbProxy('query')
                    .where({
                        schema_id:idSchema,
                        cmd:'delete'
                    })
                    .where('id', '>', idMaxRepDeleteQuery)
                    .select()
                    .limit(100)
                )

                // idMaxQueryInsert = _.max(aQueryInsert.map(el => el.id));
                // idMinQueryInsert = _.max(aQueryInsert.map(el => el.id));

                console.log('>>>dbReplication4_DELETE>>>', 'aQueryDelete', aQueryDelete.length)

                cntQuery+=aQueryDelete.length;
                
                for (let i = 0; i < aQueryDelete.length; i++) {
                    

                    const vQueryDelete = aQueryDelete[i];

                    // console.log(vQueryDelete);

                    try {
                        await dbMaster.raw(vQueryDelete.data);
                        await dbMaster('__replication__').insert({
                            id:vQueryDelete.id,
                            schema_id:vQueryDelete.schema_id,
                            cmd:vQueryDelete.cmd
                        }).onConflict().merge();
                    } catch (e){
                        console.log('>>>ERROR>>>', e);
                    }
                    
                }

            }

            // ================================================
            // UPDATE
            // ================================================

            //================================================
            // МаxUpdateQuery
            //================================================

            console.log('>>>dbReplication5_UPDATE>>>', 'sync')

            const idMaxUpdateQuery = (await dbProxy('query')
                .where({
                    cmd:'update',
                    schema_id:idMaxRepSchema
                })
                .max({id:'id'}))[0]?.id || 0;


            let idMaxRepUpdateQuery = (await dbMaster('__replication__')
                .where({
                    cmd:'update',
                    schema_id:idMaxRepSchema
                })
                .max({id:'id'}))[0]?.id || 0;

            if(!cntQuery && idMaxRepUpdateQuery < idMaxUpdateQuery){
                const aQueryUpdate = (await dbProxy('query')
                    .where({
                        schema_id:idSchema,
                        cmd:'update'
                    })
                    .where('id', '>', idMaxRepUpdateQuery)
                    .select()
                    .limit(100)
                )

                // idMaxQueryInsert = _.max(aQueryInsert.map(el => el.id));
                // idMinQueryInsert = _.max(aQueryInsert.map(el => el.id));

                console.log('>>>dbReplication6_DELETE>>>', 'aQueryUpdate', aQueryUpdate.length)

                cntQuery+=aQueryUpdate.length;
                
                for (let i = 0; i < aQueryUpdate.length; i++) {
                    

                    const vQueryUpdate = aQueryUpdate[i];

                    // console.log(vQueryUpdate);

                    try {
                        await dbMaster.raw(vQueryUpdate.data);
                        await dbMaster('__replication__').insert({
                            id:vQueryUpdate.id,
                            schema_id:vQueryUpdate.schema_id,
                            cmd:vQueryUpdate.cmd
                        }).onConflict().merge();
                    } catch (e){
                        console.log('>>>ERROR>>>', e);
                    }
                    
                }

            }

            //================================================
            // INCREMENT SCHEMA
            //================================================
            

            if( // Инкремент схемы
                idMaxInsertQuery == idMaxRepInsertQuery 
            && 
                idMaxSchema > idMaxRepSchema
            ){
                idSchema++;

                await dbMaster('__replication__').insert({
                    id:(++idMaxRep),
                    schema_id:idSchema,
                    cmd:'schema'
                }).onConflict().merge();

                // idMaxRepInsertQuery = (await dbMaster('__replication__')
                // .where({
                //     cmd:'insert',
                //     schema_id:idSchema
                // })
                // .max({id:'id'}))[0]?.id || 0;

                console.log('>>>change schema>>>',idSchema, ' id:',idMaxRep)
            }
            
            
        }
    } //f
}