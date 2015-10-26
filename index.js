var BASE_URL = '/api/search.php';
var HOST = 'skiplagged.com';
var connection = null;
var flight_info = {};

module.exports = Flight;

function Flight(data) {
  data.CONFIG = data.CONFIG || {};
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
  this.destination = flight_info.destination = data.TO;
  this.skip_hidden_city = flight_info.skip_hidden_city = data.SKIP_HIDDEN_CITY;

  if(data.SAVE_TO_DATABASE === true) {
    startMysqlConnection(data.CONFIG.MYSQL);
  }
}

function startMysqlConnection(database_config) {
  var error = false;

  if('DATABASE' in database_config === false || database_config.DATABASE.length === 0) {
    error = true;
    console.log('Missing Database Name in Config');
  }
  if('USERNAME' in database_config === false || database_config.USERNAME.length === 0) {
    error = true;
    console.log('Missing Username in Config');
  }
  if('PASSWORD' in database_config === false || database_config.PASSWORD.length === 0) {
    error = true;
    console.log('Missing Database in Config');
  }
  if('HOST' in database_config === false || database_config.HOST.length === 0) {
    error = true;
    console.log('Missing Host in Config');
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
        console.log(err);
      }
      else {
        startCron();
      }
    });
  }
}

function startCron() {
  setInterval(function() {
    flightDataQuery();
  }, 10000);
}

function flightDataQuery() {
  getFlightData(flight_info.flightUrl, 1, flight_info.destination, flight_info.skip_hidden_city, function(data) {
    insertFlightData(data.flightData);
  });
}

function insertFlightData(flight_data) {
  var waterfall = require('async-waterfall');

  var flight_id = null;

  waterfall([
    function(callback) {
      var query = "INSERT INTO flights (flight_key, flight_key_long, price, duration) VALUES (";
      query += connection.escape(flight_data[0].flight_key)+",";
      query += connection.escape(flight_data[0].flight_key_long)+",";
      query += connection.escape(flight_data[0].price_pennies)+",";
      query += connection.escape(flight_data[0].duration_seconds);
      query += ")";

      connection.query(query, function(error, rows) {
        if(error) {
          callback(error);
        }
        else {
          callback(null);
        }
      });
    },
    function(callback) {
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
  ], function(err, result) {
    if(err) {
      console.log(err);
    }
    else {
      console.log('Flight Inserted');
      for(var i=0; i<flight_data[0].legs.length; i++) {
        insertTripData(flight_id, flight_data, i);
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

  connection.query(query, function(error, rows) {
    if(error) {
      console.log(error);
    }
    else {
      console.log('Trip Inserted');
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

function getFlightData(flightUrl, return_count, destination, skip_hidden_city, callback) {
  var request = require('request');
  var airports = require('airport-codes');
  var moment = require('moment-timezone');
  var http = require('http');

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

      callback({flightData: flights});
    });
  });

  /*
  request(flightUrl, function(error, response, body) {
    if(body) {
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

      callback(null, flights);
    }
    else {
      console.log(error);
      callback(error);
    }
  });
  */
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
  return getFlightData(this.flightUrl, this.return_count, this.destination, this.skip_hidden_city, callback);
};
