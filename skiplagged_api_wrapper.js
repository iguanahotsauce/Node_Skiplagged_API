var BASE_URL = 'https://skiplagged.com/api/search.php';

module.exports = Flight;

function Flight(from, to, sort, return_count, depart_date, return_date) {
  var flightUrl = BASE_URL;

  flightUrl += '?from='     +
                from        +
                '&to='      +
                to          +
                '&depart='  +
                depart_date +
                '&sort='     +
                sort;

  if(typeof return_dat != 'undefined' && return_date.length > 0) {
    flightUrl += '&return=' + return_date;
  }
  else {
    flightUrl += '&return=';
  }

  this.flightUrl = flightUrl;
  this.returnCount = return_count;
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

  return parseDurationInt(difference);
}

function getFlightData(callback, flightUrl, returnCount) {
  var request = require('request');
  var airports = require('airport-codes');
  var moment = require('moment-timezone');

  var flights = [];

  request(flightUrl, function(error, response, body) {
    if(body) {
      var flight_data = JSON.parse(body);

      for(var j=0; j<flight_data.depart.length; j++) {
        var key = flight_data.depart[j][3];

        var current_flight = {
          price: '$' + (flight_data.depart[j][0][0] / 100).toFixed(2),
          duration: parseDurationInt(flight_data.flights[key][1]),
          departure_time: '',
          arrival_time: '',
          legs: []
        };

        for(var i=0; i<flight_data.flights[key][0].length; i++) {
          var airline = flight_data.airlines[flight_data.flights[key][0][i][0].substring(0, 2)];
          var flight_number = flight_data.flights[key][0][i][0];
          var departing_from = airports.findWhere({iata: flight_data.flights[key][0][i][1]}).get('name') + ', ' + flight_data.flights[key][0][i][1];
          var arriving_at = airports.findWhere({iata: flight_data.flights[key][0][i][3]}).get('name') + ', ' + flight_data.flights[key][0][i][3];
          var duration = findTimestampDifference(flight_data.flights[key][0][i][2], flight_data.flights[key][0][i][4]);
          var departure_time = moment(flight_data.flights[key][0][i][2]).format('dddd, MMMM Do YYYY, hh:mma');
          var arrival_time = moment(flight_data.flights[key][0][i][4]).format('dddd, MMMM Do YYYY, hh:mma');
          var current_leg = {airline: airline, flight_number: flight_number, duration: duration, departing_from: departing_from, departure_time: departure_time, arriving_at: arriving_at, arrival_time: arrival_time};

          if(i === 0) {
            current_flight.departure_time = departure_time;
          }
          else if(i === flight_data.flights[key][0].length - 1) {
            current_flight.arrival_time = arrival_time;
          }

          current_flight.legs.push(current_leg);
        }

        flights.push(current_flight);

        if(returnCount == 1) {
          break;
        }
      }

      callback(null, flights);
    }
    else {
      callback(error);
    }
  });
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
  return getFlightData(callback, this.flightUrl, this.returnCount);
};
