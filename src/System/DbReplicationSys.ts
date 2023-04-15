import _ from "lodash";
import { aCfDb } from "../Config/MainConfig";
import { adb, dbProxy, gixDb } from "./DBConnect";

export class DbReplicationSys {

    /** Сохранить информацию по очереди */
    public async dbReplication(){
        for (let i = 0; i < adb.length; i++) {
            // const vCfDb = adb[i];

            // if( vCfDb.connection.database != 'test_proxy_master1'){
            //     console.log('Пропуск репликации тестирование - ', vCfDb.connection.database)
            //     continue;
            // }

            console.log('>>>dbReplication1>>>')

            const dbMaster = adb[i];

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

            console.log('>>>dbReplication5>>>', 'sync')

            const idMaxInsertQuery = (await dbProxy('query')
                .where({
                    cmd:'insert',
                    schema_id:idMaxRepSchema
                })
                .max({id:'id'}))[0]?.id || 0;


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
                    .limit(10)
                )

                // idMaxQueryInsert = _.max(aQueryInsert.map(el => el.id));
                // idMinQueryInsert = _.max(aQueryInsert.map(el => el.id));

                console.log('>>>dbReplication8>>>', 'aQueryInsert', aQueryInsert.length)

                cntQuery+=aQueryInsert.length;
                cntQueryInsert = aQueryInsert.length;
                
                for (let i = 0; i < aQueryInsert.length; i++) {
                    

                    const vQueryInsert = aQueryInsert[i];

                    console.log(vQueryInsert);

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

            //================================================
            // МаxDeleteQuery
            //================================================

            console.log('>>>dbReplication5>>>', 'sync')

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
                    .limit(10)
                )

                // idMaxQueryInsert = _.max(aQueryInsert.map(el => el.id));
                // idMinQueryInsert = _.max(aQueryInsert.map(el => el.id));

                console.log('>>>dbReplication8>>>', 'aQueryUpdate', aQueryDelete.length)

                cntQuery+=aQueryDelete.length;
                
                for (let i = 0; i < aQueryDelete.length; i++) {
                    

                    const vQueryDelete = aQueryDelete[i];

                    console.log(vQueryDelete);

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

            //================================================
            //================================================

            //================================================
            // МаxUpdateQuery
            //================================================

            console.log('>>>dbReplication5>>>', 'sync')

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
                    .limit(10)
                )

                // idMaxQueryInsert = _.max(aQueryInsert.map(el => el.id));
                // idMinQueryInsert = _.max(aQueryInsert.map(el => el.id));

                console.log('>>>dbReplication8>>>', 'aQueryUpdate', aQueryUpdate.length)

                cntQuery+=aQueryUpdate.length;
                
                for (let i = 0; i < aQueryUpdate.length; i++) {
                    

                    const vQueryUpdate = aQueryUpdate[i];

                    console.log(vQueryUpdate);

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