const { BadRequestError } = require("../expressError");

// SDK - documentation
// Allows one to update only certain fields in a database object.
// .. rather than needing to call with data for every single field - filled with mostly the same data)
//     'dataToUpdate' is an object containing the data to be changed (ex. {age: 25, isAdmin: true})
//     'jsToSql' provides mappings (if needed) from Javascript labels to SQL-style fields (ex. {isAdmin: "is_admin"})
// returns SQL syntax needed for the UPDATE call:
//     'setCols' for the SET clause (ex. ' "age"=$1, "is_admin"=$2 ')
//     'values' for the values provided as $n's (to avoid SQL injection) (ex. [25, true])
function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {age: 25, isAdmin: true} => ['"age"=$1', '"is_admin"=$2']
  // map to proper syntax for each field ...
  const cols = keys.map(
    (colName, idx) => `"${jsToSql[colName] || colName}"=$${idx + 1}`
  );

  return {
    setCols: cols.join(", "), // ... then concat them, comma-separated
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
