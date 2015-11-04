var BASE_URL = '/api/search.php';
var HOST = 'skiplagged.com';
var fs = require('fs');
var log = 'flights_log.txt';
var connection = null;
var transporter = null;
var flight_info = {};
var email_info = {};

module.exports = Flight;

function Flight(data) {
  data.CONFIG = config = data.CONFIG || {};
  data.RESULTS = data.RESULTS || 1;
  data.SORT = data.SORT || 'cost';
  data.RETURN_DATE = data.RETURN_DATE || '';
  data.SKIP_HIDDEN_CITY = 'SKIP_HIDDEN_CITY' in data ? data.SKIP_HIDDEN_CITY : true;
  data.SAVE_TO_DATABASE = 'SAVE_TO_DATABASE' in data ? data.SAVE_TO_DATABASE : false;

  var flightUrl = BASE_URL;

  flightUrl += '?from='          +
                data.FROM        +
                '&to='           +
                data.TO          +
                '&depart='       +
                data.DEPART_DATE +
                '&return'        +
                data.RETURN_DATE +
                '&sort='         +
                data.SORT;

  this.flightUrl = flight_info.flightUrl = flightUrl;
  this.return_count = flight_info.return_count = data.RESULTS;
  this.departure = flight_info.departure = data.FROM;
  this.destination = flight_info.destination = data.TO;
  this.skip_hidden_city = flight_info.skip_hidden_city = data.SKIP_HIDDEN_CITY;
  this.departure_date = flight_info.departure_date = data.DEPART_DATE;

  if(data.SAVE_TO_DATABASE === true) {
    data.MIN_PERCENT_CHANGE = data.MIN_PERCENT_CHANGE || 0;
    data.CONFIG.EMAIL = data.CONFIG.EMAIL || {};
    data.CONFIG.MYSQL = data.CONFIG.MYSQL || {};

    flight_info.MIN_PERCENT_CHANGE = data.MIN_PERCENT_CHANGE;

    email_info.USER = data.CONFIG.EMAIL.USER || '';
    email_info.TO = data.CONFIG.EMAIL.TO || '';
    email_info.NAME = data.CONFIG.EMAIL.NAME || 'User';

    startMysqlConnection(data.CONFIG.MYSQL);
    startEmailTransporter(data.CONFIG.EMAIL);
  }
}

function startMysqlConnection(database_config) {
  var error = false;

  if('DATABASE' in database_config === false || database_config.DATABASE.length === 0) {
    error = true;
    appendLogFile("Missing Database Name in Config\n\n");
  }
  if('USERNAME' in database_config === false || database_config.USERNAME.length === 0) {
    error = true;
    appendLogFile(" Missing Username in Config\n\n");
  }
  if('PASSWORD' in database_config === false || database_config.PASSWORD.length === 0) {
    error = true;
    appendLogFile("Missing Database in Config\n\n");
  }
  if('HOST' in database_config === false || database_config.HOST.length === 0) {
    error = true;
    appendLogFile("Missing Host in Config\n\n");
  }

  if(error === false) {
    var mysql = require('mysql');

    connection = mysql.createConnection({
      host: database_config.HOST,
      user: database_config.USERNAME,
      password: database_config.PASSWORD,
      database: database_config.DATABASE
    });

    connection.connect(function(err) {
      if(err) {
        appendLogFile(JSON.stringify(err, undefined, 4) + "\n\n");
      }
      else {
        startCron();
      }
    });
  }
}

function startEmailTransporter(email_config) {
  var error = false;

  if(typeof email_config.SERVICE == 'undefined' || email_config.SERVICE.length === 0) {
    error = true;
    appendLogFile("Missing or Invalid Email Servivce Type\n\n");
  }

  if(typeof email_config.USER == 'undefined' || email_config.USER.length === 0) {
    error = true;
    appendLogFile("Missing or Invalid Email User");
  }

  if(typeof email_config.PASSWORD == 'undefined' || email_config.PASSWORD.length === 0) {
    error = true;
    appendLogFile("Missing or Invalid Email Password\n\n");
  }

  if(error === false) {
    var nodemailer = require('nodemailer');

    transporter = nodemailer.createTransport({
  	    service: email_config.SERVICE,
  	    auth: {
  	        user: email_config.USER,
  	        pass: email_config.PASSWORD
  	    }
  	});
  }
}

function startCron() {
  setInterval(function() {
    flightDataQuery();
  }, 300000);
}

function flightDataQuery() {
  var data = {
    flightUrl: flight_info.flightUrl,
    return_count: 1,
    destination: flight_info.destination,
    skip_hidden_city: flight_info.skip_hidden_city
  };

  var waterfall = require('async-waterfall');

  getFlightData(data, function(error, body) {
    waterfall([
      function(callback) {
        checkCurrentPrice(body.flightData);
        callback(null);
      },
      function(callback) {
        insertFlightData(body.flightData);
        callback(null);
      }
    ], function(err, result) {
      if(err) {
        appendLogFile(JSON.stringify(err, undefined, 4) + "\n\n");
      }
    });
  });
}

function checkCurrentPrice(flightData) {
  var all_time_low_query = "SELECT MIN(price) as lowest_price from flights where from_iata = "+connection.escape(flight_info.departure)+" and to_iata = "+connection.escape(flight_info.destination) + " and date(departure_date) = "+connection.escape(flight_info.departure_date);
  var current_low_query = "SELECT price from flights where from_iata = "+connection.escape(flight_info.departure)+" and to_iata = "+connection.escape(flight_info.destination) + " and date(departure_date) = "+connection.escape(flight_info.departure_date) + " and current_low = " + connection.escape("y");

  var current_low = null;
  var all_time_low = null;

  var waterfall = require('async-waterfall');

  waterfall([
    function(callback) {
      connection.query(current_low_query, function(err, rows) {
        if(err) {
          callback(err);
        }
        else if(rows.length === 0) {
          callback({error: 'No Current Low Found'});
        }
        else {
          current_low = rows[0].price;
        }
      });
    },
    function(callback) {
      connection.query(all_time_low_query, function(err, rows) {
        if(err) {
          callback(err);
        }
        else {
          if(rows.length !== 0) {
            all_time_low = rows[0].lowest_price;
          }

          callback(null);
        }
      });
    }
  ],
  function(err, result) {
    if(err) {
      appendFile(JSON.stringify(err, undefined, 4) + "\n\n");
    }
    else if(current_low !== null) {
      var subject_string = '';
      var current_price_pennies = flightData[0].price_pennies;

      if(current_price_pennies > (current_low * (1 + flight_info.MIN_PERCENT_CHANGE))) {
        subject_string = 'Flight Price for ' + flight_info.departure + ' To ' + flight_info.destination + ' Increased ' + ((current_price_pennies / current_low - 1) * 100).toFixed() + '%';

        if(all_time_low !== null) {
          subject_string += ' Up ' + ((current_price_pennies / all_time_low - 1) * 100).toFixed() + '% From The All Time Low of $' + (all_time_low / 100).toFixed(1);
        }

        sendEmail(flightData, subject_string);
      }
      else if(current_price_pennies < (current_low * (1 - flight_info.MIN_PERCENT_CHANGE))) {
        subject_string = 'Flight Price for ' + flight_info.departure + ' To ' + flight_info.destination + ' Dropped ' + ((1 - current_price_pennies / current_low) * 100).toFixed() + '%';

        if(all_time_low !== null) {
          subject_string += ' Down ' + ((current_price_pennies / all_time_low - 1) * 100).toFixed() + '% From The All Time Low of $' + (all_time_low / 100).toFixed(1);
        }

        sendEmail(flightData, subject_string);
      }
    }
  });
  connection.query(query, function(err, rows) {
    if(err) {
      appendLogFile(JSON.stringify(err, undefined, 4) + "\n\n");
    }
    else {
      var lowest_price = rows[0].lowest_price;

    }
  });
}

function sendEmail(flightData, subject_string) {
  var error = false;

  if(email_info.USER.length === 0) {
    error = true;
    appendLogFile("Missing User Email\n\n");
  }

  if(email_info.TO.length === 0) {
    error = true;
    appendLogFile("Missing To Email\n\n");
  }

  if(error === false) {
    var mailOptions = {
  	    from:  email_info.NAME + ' <' + email_info.USER + '>',
  	    to: email_info.TO,
  	    subject: subject_string,
  	    html: '<pre>'+JSON.stringify(flightData, undefined, 4)+'</pre>'
  	};

    transporter.sendMail(mailOptions, function(err, info){
  	    if(err){
            appendLogFile(JSON.stringify(err, undefined, 4) + "\n\n");
  	    }
        else {
          appendLogFile("Email Sent - " + subject_string + "\n\n");
        }
  	});
  }
}

function insertFlightData(flight_data) {
  var waterfall = require('async-waterfall');

  var flight_id = null;
  var flight_exists = false;

  waterfall([
    function(callback) {
      var query = "SELECT * from flights where flight_key_long = " + connection.escape(flight_data[0].flight_key_long) + " and price = " + connection.escape(flight_data[0].price_pennies);

      connection.query(query, function(error, rows) {
        if(rows.length > 0) flight_exists = true;
        callback(null);
      });
    },
    function(callback) {
      if(flight_exists === false) {
        var query = "UPDATE flights SET current_low = " + connection.escape("N") + " where from_iata = " +connection.escape(flight_info.departure) + " and to_iata = " + connection.escape(flight_info.destination);

        connection.query(query, function(err, rows) {
          if(err) {
            callback(err);
          }
          else {
            callback(null);
          }
        });
      }
    },
    function(callback) {
      if(flight_exists === false) {
        var query = "INSERT INTO flights (flight_key, flight_key_long, price, duration, departure_date, from_iata, to_iata, current_low, insert_date) VALUES (";
        query += connection.escape(flight_data[0].flight_key)+",";
        query += connection.escape(flight_data[0].flight_key_long)+",";
        query += connection.escape(flight_data[0].price_pennies)+",";
        query += connection.escape(flight_data[0].duration_seconds)+",";
        query += connection.escape(flight_data[0].legs[0].departure_time_formatted)+",";
        query += connection.escape(flight_info.departure)+",";
        query += connection.escape(flight_info.destination)+",";
        query += connection.escape("Y")+",";
        query += connection.escape("NOW()");
        query += ")";

        connection.query(query, function(error, rows) {
          if(error) {
            callback(error);
          }
          else {
            callback(null);
          }
        });
      }
      else {
        callback(null);
      }
    },
    function(callback) {
      if(flight_exists === false) {
        connection.query("SELECT flight_id FROM flights ORDER BY flight_id DESC LIMIT 1", function(error, rows) {
          if(error) {
            callback(error);
          }
          else {
            flight_id = rows[0].flight_id;

            callback(null);
          }
        });
      }
      else {
        callback(null);
      }
    }
  ], function(err, result) {
    if(err) {
      appendLogFile(JSON.stringify(err, undefined, 4) + "\n\n");
    }
    else {
      if(flight_exists === false) {
        var flight_string = "";

        flight_string += "New Flight Found\n\n";
        flight_string += "Price: " + flight_data[0].price + "\n";
        flight_string += "Duration: " + flight_data[0].duration + "\n";
        flight_string += "Departure DateTime: " + flight_data[0].departure_time + "\n";
        flight_string += "Arrival DateTime: " + flight_data[0].arrival_time + "\n";
        flight_string += "Flight Key: " + flight_data[0].flight_key + "\n";
        flight_string += "Flight Key Long: " + flight_data[0].flight_key_long + "\n\n";
        flight_string += "Flight Inserted\n\n";

        appendLogFile(flight_string);

        for(var i=0; i<flight_data[0].legs.length; i++) {
          insertTripData(flight_id, flight_data, i);
        }
      }
      else {
        appendLogFile("Flight Already In Database\n\n");
      }
    }
  });
}

function insertTripData(flight_id, flight_data, leg_number) {
  var moment = require('moment-timezone');

  var current_flight = flight_data[0].legs[leg_number];

  var duration_seconds = current_flight.duration_seconds;
  var departure_iata = current_flight.departing_from.split(',');
  departure_iata = departure_iata[1].trim();
  var departure_time = moment.tz(current_flight.departure_time_formatted, 'America/New_York').utc().format("YYYY-MM-DD HH:mm:ss");
  var arrival_iata = current_flight.arriving_at.split(',');
  arrival_iata = arrival_iata[1].trim();
  var arrival_time = moment.tz(current_flight.arrival_time_formatted, 'America/New_York').utc().format("YYYY-MM-DD HH:mm:ss");

  var query = "INSERT INTO trips (airline, duration, flight_number, departure_airport_iata, departure_time, arrival_airport_iata, arrival_time, flight_id)";
  query += " VALUES (";
  query += connection.escape(current_flight.airline)+",";
  query += connection.escape(duration_seconds)+",";
  query += connection.escape(current_flight.flight_number)+",";
  query += connection.escape(departure_iata)+",";
  query += connection.escape(departure_time)+",";
  query += connection.escape(arrival_iata)+",";
  query += connection.escape(arrival_time)+",";
  query += connection.escape(flight_id);
  query += ")";

  connection.query(query, function(err, rows) {
    if(err) {
      appendLogFile(JSON.stringify(err, undefined, 4) + "\n\n");
    }
    else {
      var trip_string = "";

      trip_string += "New Trip\n\n";
      trip_string += "Airline: " + current_flight.airline + "\n";
      trip_string += "Flight Number: " + current_flight.flight_number + "\n";
      trip_string += "Duration: " + current_flight.duration + "\n";
      trip_string += "Departing From: " + current_flight.departing_from + "\n";
      trip_string += "Departure DateTime: " + current_flight.departure_time + "\n";
      trip_string += "Arriving At: " + current_flight.arriving_at + "\n";
      trip_string += "Arrival DateTime: " + current_flight.arrival_time + "\n\n";
      trip_string += "Trip Inserted\n\n";

      appendLogFile(trip_string);
    }
  });
}

function parseDurationInt(duration) {
  var minutes = Math.round(duration / 60);
  var duration_string = '';

  var minutes_string = minutes !== 0 ? (minutes + ' Minute' + (minutes > 1 ? 's' : '')) : '';

  if(minutes >= 60) {
    var minutes_r = minutes % 60;
    var hours = (minutes - minutes_r) / 60;

    var hours_string = hours !== 0 ? (hours + ' Hour' + (hours > 1 ? 's ' : ' ')) : '';

    minutes_string = (minutes - hours * 60) !== 0 ? ((minutes - hours * 60) + ' Minute' + ((minutes - hours * 60) > 1 ? 's' : '')) : '';

    if(hours >= 24) {
      var hours_r = hours % 24;
      var days = (hours - hours_r) / 24;

      hours_string = (hours - days * 24) !== 0 ? ((hours - days * 24) + ' Hour' + ((hours - days * 24) > 1 ? 's ' : ' ')) : '';

      duration_string = days + ' Day' + (days > 1 ? 's ' : ' ') + hours_string + minutes_string;
    }
    else {
      duration_string = hours_string + minutes_string;
    }
  }
  else {
    duration_string = minutes_string;
  }

  return duration_string;
}

function findTimestampDifference(start_timestamp, end_timestamp) {
  var moment = require('moment-timezone');
  var zone = "America/Los_Angeles";

  var start_timestamp_zoned = moment(moment.tz(start_timestamp, zone).format());
  var end_timestamp_zoned = moment(moment.tz(end_timestamp, zone).format());

  var difference = end_timestamp_zoned.diff(start_timestamp_zoned, 'seconds');

  return difference;
}

function getFlightData(data, callback) {
  var request = require('request');
  var airports = require('airport-codes');
  var http = require('http');
  var moment = require('moment-timezone');

  var flightUrl = data.flightUrl;
  var return_count = data.return_count;
  var destination = data.destination;
  var skip_hidden_city = data.skip_hidden_city;

  var flights = [];

  return http.get({host: HOST, path: flightUrl}, function(response) {
    var body = '';

    response.on('data', function(data) {
      body += data;
    })
    .on('end', function() {
      var flight_data = JSON.parse(body);

      for(var j=0; j<flight_data.depart.length; j++) {
        var is_hidden_city = false;

        var key = flight_data.depart[j][3];

        var current_flight = {
          price: '$' + (flight_data.depart[j][0][0] / 100).toFixed(2),
          price_pennies: flight_data.depart[j][0][0],
          duration: parseDurationInt(flight_data.flights[key][1]),
          duration_seconds: flight_data.flights[key][1],
          departure_time: '',
          arrival_time: '',
          legs: [],
          flight_key: key,
          flight_key_long: flight_data.depart[j][2]
        };

        for(var i=0; i<flight_data.flights[key][0].length; i++) {
          if(i === (flight_data.flights[key][0].length - 1) && flight_data.flights[key][0][i][3] != destination && skip_hidden_city === true) {
            is_hidden_city = true;
            break;
          }

          var duration_seconds = findTimestampDifference(flight_data.flights[key][0][i][2], flight_data.flights[key][0][i][4]);
          var duration_formatted = parseDurationInt(duration_seconds);

          var airline = flight_data.airlines[flight_data.flights[key][0][i][0].substring(0, 2)];
          var flight_number = flight_data.flights[key][0][i][0];
          var departing_from = airports.findWhere({iata: flight_data.flights[key][0][i][1]}).get('name') + ', ' + flight_data.flights[key][0][i][1] + ', ' + airports.findWhere({iata: flight_data.flights[key][0][i][1]}).get('city') + ', ' + airports.findWhere({iata: flight_data.flights[key][0][i][1]}).get('country');
          var arriving_at = airports.findWhere({iata: flight_data.flights[key][0][i][3]}).get('name') + ', ' + flight_data.flights[key][0][i][3] + ', ' + airports.findWhere({iata: flight_data.flights[key][0][i][3]}).get('city') + ', ' + airports.findWhere({iata: flight_data.flights[key][0][i][3]}).get('country');
          var departure_time = moment(flight_data.flights[key][0][i][2]).format('dddd, MMMM Do YYYY, hh:mma');
          var departure_time_formatted = flight_data.flights[key][0][i][2];
          var arrival_time = moment(flight_data.flights[key][0][i][4]).format('dddd, MMMM Do YYYY, hh:mma');
          var arrival_time_formatted = flight_data.flights[key][0][i][4];
          var current_leg = {airline: airline, flight_number: flight_number, duration: duration_formatted, duration_seconds: duration_seconds, departing_from: departing_from, departure_time: departure_time, departure_time_formatted: departure_time_formatted, arriving_at: arriving_at, arrival_time: arrival_time, arrival_time_formatted: arrival_time_formatted};

          if(i === 0) {
            current_flight.departure_time = departure_time;
          }
          else if(i === flight_data.flights[key][0].length - 1) {
            current_flight.arrival_time = arrival_time;
          }

          current_flight.legs.push(current_leg);
        }

        if(is_hidden_city === false) {
          flights.push(current_flight);
        }

        if(return_count === 1 && flights.length === 1) {
          break;
        }
      }

      callback(null, {flightData: flights});
    });
  });
}

function appendLogFile(text) {
  var moment = require('moment-timezone');
  var datetime = moment().tz("America/Los_Angeles").format();
  console.log(datetime);
  fs.appendFile(log, datetime + " " + text);
}

Flight.prototype.parseDuration = function(duration) {
  return parseDurationInt(duration);
};

Flight.prototype.timestampDifference = function(start_timestamp, end_timestamp) {
  return findTimestampDifference(start_timestamp, end_timestamp);
};

Flight.prototype.getFlightUrl = function() {
  return this.flightUrl;
};

Flight.prototype.getFlightData = function(callback) {
  var data = {
    flightUrl: this.flightUrl,
    return_count: this.return_count,
    destination: this.destination,
    skip_hidden_city: this.skip_hidden_city
  };

  return getFlightData(data, callback);
};
