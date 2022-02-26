// ==============================================================
// Подключения баз данных
// ==============================================================

export const cfDbProxy = { // Knex mysql
    client: "mysql",
    connection: {
        host: "localhost",
        user: "root",
        port:3000,
        password: "Angel13q24w35e",
        database: "test_proxy_master"
    },
    pool: { "min": 0, "max": 7 },
    acquireConnectionTimeout: 5000
};

export const cfDbProxy2 = { // Knex mysql
    client: "mysql",
    connection: {
        host: "localhost",
        user: "root",
        port:3001,
        password: "Angel13q24w35e",
        database: "test_proxy_master"
    },
    pool: { "min": 0, "max": 7 },
    acquireConnectionTimeout: 5000
};

export const cfDbMaster = { // Knex mysql
    client: "mysql",
    connection: {
        host: "localhost",
        user: "root",
        password: "Angel13q24w35e",
        database: "test_proxy_master"
    },
    pool: { "min": 0, "max": 7 },
    acquireConnectionTimeout: 5000
};

export const cfDbSlave1 = { // Knex mysql
    client: "mysql",
    connection: {
        host: "localhost",
        user: "root",
        password: "Angel13q24w35e",
        database: "test_proxy_slave1"
    },
    pool: { "min": 0, "max": 7 },
    acquireConnectionTimeout: 5000
};

export const cfDbSlave2 = { // Knex mysql
    client: "mysql",
    connection: {
        host: "localhost",
        user: "root",
        password: "Angel13q24w35e",
        database: "test_proxy_slave2"
    },
    pool: { "min": 0, "max": 7 },
    acquireConnectionTimeout: 5000
};