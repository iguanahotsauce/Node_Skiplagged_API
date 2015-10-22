var Flights = require('flights');

var data = {
  FROM: 'PDX',
  TO: 'JFK',
  DEPART_DATE: '2015-10-25'
};

var CurrentFlight = new Flights(data);

CurrentFlight.getFlightData(function(error, body) {
  body = JSON.stringify(body, undefined, 4);
  console.log(body);
});
