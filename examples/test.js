var Flights = require('flights');
var CurrentFlight = new Flights('MCO', 'PDX', 'path', 1, '2016-03-08');

CurrentFlight.getFlightData(function(error, body) {
  body = JSON.stringify(body, undefined, 4);
  console.log(body);
});
