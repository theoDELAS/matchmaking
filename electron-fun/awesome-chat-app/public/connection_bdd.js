const mysql = require('mysql');

document.getElementById('btn').addEventListener("click", () => {

    const connection = mysql.createConnection({
      host: "localhost",
      user: "root",
      password: null,
      database: "electron"
    });

    connection.connect((err) => {
      if(err) {
        return console.log(err.stack);
      }

      console.log("Connexion réussi");
    });

    $queryString = 'SELECT * FROM `employee` WHERE `name` LIKE "Jane";';

    connection.query($queryString, (err, rows, fields) => {
        if(err) {
            return console.log("Error est survenue", err);
        }
        document.querySelector('#names').innerHTML += rows[0].name;
        console.log(rows[0].name);
    })

    connection.end(() => {
        console.log("Connexion fermé avec succès");
    });
  }, false)