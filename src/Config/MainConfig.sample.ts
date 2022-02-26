export const mysql = { // Knex mysql
    client: "mysql",
    connection: {
        host: "localhost",
        user: "root",
        password: "*",
        database: "*"
    },
    pool: { "min": 0, "max": 7 },
    acquireConnectionTimeout: 60000
};