const mysqlDb = require ( 'mysql');

// Define the database pool, this needs to be in the global object
let pool = undefined;

const mysqlDB = () => {

    // Setup the database connection details
    const DB_HOST = process.env.DB_HOST;
    const DB_USER = process.env.DB_USER;
    const DB_PASSWORD = process.env.DB_PASSWORD;
    const DB_DATABASE = process.env.DB_DATABASE;
    const DB_PORT     = process.env.DB_PORT;

    // 
    // checkConnected
    // 
    // Check the database is connected too.
    // 
    // 
    // 
    function checkConnected () {

        return new Promise (function (resolve, reject) {

            // Get a connection from the mysql connection pool
            pool.getConnection(function(err, connection) {
                if (err) return reject({error: err}); 
        
                return resolve ( { msg: 'Connected.' });
            });
        });
    }


    // 
    // Function : connectToDB
    //
    // Create a connection to the MySQL database and create a connection pool
    //
    // ReturnValues : None
    //  
    async function connectToDB () {

        try {
            if ( pool === undefined ){

                pool = await mysqlDb.createPool({
                    connectionLimit : 10,
                    host            : DB_HOST,
                    user            : DB_USER,
                    password        : DB_PASSWORD,
                    database        : DB_DATABASE,
                    port            : DB_PORT
                });

                await checkConnected ();
            }

        } catch (err) {
            console.error(err.message);
            process.exit(1);
        }
    }

    // 
    // Function : disconnectDB
    // 
    // Disconnect from the database and terminate the connection pool
    // 
    // ReturnValues : None
    // 
    async function disconnectDB () {
        await pool.end();
    }

    // 
    // Function: convertSqlValue
    // 
    // This function takes a variable and prepares it to be inserted into the database
    // 
    // ReturnValue : Returns a value that can be inserted into the database. ie a string needs to quoted
    // 
    function convertSqlValue ( value ) {

        let val;

        switch (typeof(value)) {
            case 'string': val = `'${value}'`; break;
            case 'number': val = value.toString(); break;
            case 'boolean': val = value; break;
            case 'undefined': val = 'null'; break;
            default: 
                if ( value === null ) val = 'null'
                break;
        }

        return val;

    }

    // 
    // Function : createInsertSql
    // 
    // This function takes a table name and an object to be insert, it turns this into an insert statement
    // 
    // ReturnValues : Returns the insert sql.
    function createInsertSql ( tableName, insertObj ) {

        let cols = "";
        let values = "";

        for ( let key in insertObj ){
        
            let val = convertSqlValue (insertObj[key]);
        
            if (cols.length === 0) {
                cols = key;
                values = val;
            } else {
                cols = cols + ', ' + key;
                values = `${values}, ${val}`;
            }
        }
        
        return  `INSERT INTO ${tableName} ( ${cols} ) VALUES ( ${values})`;
    }

    // 
    // Function : createUpdateSql
    // 
    // This function takes a table name and an object, it turns this into an update statement
    // 
    // ReturnValues : Returns the update sql without the where clause
    // 
    function createUpdateSql ( tableName, dataObj ) {
        let setStatement = "";

        // Calculate set statement
        for ( let key in dataObj ){
        
            let val = convertSqlValue (dataObj[key]);
        
            if (setStatement.length === 0) {
                setStatement = `SET ${key} = ${val}`;
            } else {
                setStatement = `${setStatement}, ${key} = ${val}`;
            }
        }

        return `UPDATE ${tableName} ${setStatement} `;
    }

    // 
    // Function :   createWhereClause
    // 
    // This function takes an object and constructs a where clause
    // 
    // Returns the where clause
    //
    function createWhereClause ( whereObj ) {
        let whereStatement = "";

        // Calculate where statement
        for ( let key in whereObj ){
        
            let val = convertSqlValue (whereObj[key]);
        
            if (whereStatement.length === 0) {
                whereStatement = `WHERE ${key} = ${val}`;
            } else {
                whereStatement = `${whereStatement} AND ${key} = ${val}`;
            }
        }

        return whereStatement;
    }

    //
    // Function : executeData
    //
    // Description: This function executes the sql we pass to it. It is returned via a promise to allow syncronous running.
    //
    // ReturnValues :
    //   error      This lists the errors found
    //   results    This returns the data and the status of the execution
    //   fields     This returns the type of fields returned
    //   
    function executeSQL (query) {

        return new Promise (function (resolve, reject) {

            // Get a connection from the mysql connection pool
            pool.getConnection(function(err, connection) {
                if (err) return reject({error: err}); 
        
                // Use the connection
                try {
                    connection.query(query, function (error, results, fields) {
                        // When done with the connection, release it.
                        connection.release();

                        if (error === null){
                            return resolve ( { error, results, fields });
                        } else {
                            return reject(error);
                        }
                    });
                    
                } catch (error) {
                    console.error (error);
                    return reject(error);
                }
            });
        });
    }

    //
    // Function : selectData
    //
    // Description: This function is called with a select statement. It executes the select statement and returns the results.
    //
    // ReturnValues :
    //  Success
    //      error       True if error occurred
    //      rows        This contains the number of records found
    //      data        This contains the data found
    // 
    //  Failure
    //      error       True if error occurred
    //      errNo       The MySQL error numner
    //      errMsg      The MySQL error message
    //      sqlState    The Mysql sqlState
    //   
    async function selectData (sql, whereObj) {

        try {

            if ( whereObj !== undefined) {
                sql += db.createWhereClause (whereObj);
            }

            const res = await executeSQL(sql);

            const returnDets = {
                error : (res.error?true:false),
                rows : res.results.length,
                data  : []
            };

            res.results.forEach( ( obj ) => {
                returnDets.data.push ( obj );
            });

            return (returnDets);

        }catch (err) {
            console.error (err);

            const userDets = {
                error    : true,
                errNo    : err.errno,
                errMsg   : err.sqlMessage,
                sqlState : err.sqlState
            };

            return (userDets);
        }
    }

    //
    // Function : saveData
    //
    // Description: This function is called with an insert / update statement. It executes the  statement and returns the status.
    //
    // ReturnValues :
    //  Success
    //      error           True if error occurred
    //      errNo           The MySQL error number
    //      insertId        The record number if the table is auto incremented
    //      affectedRows    The number of rows affected
    //      changedRows     The number of rows affected
    // 
    //  Failure
    //      error           True if error occurred
    //      errNo           The MySQL error numner
    //      errMsg          The MySQL error message
    //      sqlState        The Mysql sqlState
    //   
    async function saveData (sql, whereObj) {

        const returnStatus = { };

        try {

            if ( whereObj !== undefined) {
                sql += db.createWhereClause (whereObj);
            }
            const res = await executeSQL(sql);
            if ( !res.error ){
                returnStatus.error          = false;
                returnStatus.errNo          = 0;
                returnStatus.insertId       = res.results.insertId;
                returnStatus.affectedRows   = res.results.affectedRows;
                returnStatus.changedRows    = res.results.changedRows;
            } 
        
        }catch (err) {

            returnStatus.error = true;
            returnStatus.errNo = err.errno;
            returnStatus.errMsg = err.sqlMessage;
            returnStatus.sqlState = err.sqlState;
        }

        return (returnStatus);
    }

    //
    // Function : insertProcedure
    //
    // Description: This function is called as a wrapper to insert data into a table. The stored procedurfe it calls 
    //              will select data to be returned and this wrapper will pass that back.
    //
    // ReturnValues :
    //  Success
    //      error           False is no error occured
    //      errNo           0 is no error occurred.
    //      insertId        The record number if the table is auto incremented
    //      affectedRows    The number of rows affected
    //      changedRows     The number of rows affected
    // 
    //  Failure
    //      error           True if error occurred
    //      errNo           The MySQL error numner
    //      errMsg          The MySQL error message
    //      sqlState        The Mysql sqlState
    //   
    async function insertProcedure (sql) {

        const returnStatus = { };

        try {

            const res = await executeSQL(sql);

            if ( !res.error ){

                let insertedId = ( res.results === undefined? undefined: res.results[0][0].inserted_id)
                let affectedRows = ( res.results === undefined? 0: res.results[0][0].affectedRows)
                let changedRows = ( res.results === undefined? 0: res.results[0][0].changedRows)

                returnStatus.error          = false;
                returnStatus.errNo          = 0;
                returnStatus.insertId       = insertedId;
                returnStatus.affectedRows   = affectedRows;
                returnStatus.changedRows    = changedRows;
            } 
        
        }catch (err) {

            returnStatus.error = true;
            returnStatus.errNo = err.errno;
            returnStatus.errMsg = err.sqlMessage;
            returnStatus.sqlState = err.sqlState;
        }

        return (returnStatus);
    }

    // 
    // These are the functions we are exposing from the database closure
    // 
    return {
        connectToDB,
        disconnectDB,
        createInsertSql,
        createUpdateSql,
        createWhereClause,
        selectData,
        saveData,
        insertProcedure
    };
}



module.exports.mysqlDB = mysqlDB;

