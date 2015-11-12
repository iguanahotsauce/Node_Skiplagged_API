var Flights = require('../index');
var config = require('./config');

var data = {
  FROM: 'PDX',
  TO: 'JFK',
  DEPART_DATE: '2016-06-01',
  FLIGHT_TIME: 22,
  BEFORE_OR_AFTER: 'AFTER'
};

var CurrentFlight = new Flights(data);

CurrentFlight.getFlightData(function(error, body) {
  body = JSON.stringify(body, undefined, 4);
  console.log(body);
});
