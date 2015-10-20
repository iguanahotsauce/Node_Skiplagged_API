(function () {
  'use strict';

  var cheerio = ('cheerio');
  var request = ('request');

  var url = 'https://skiplagged.com/api/search.php';

  function Skiplagged() { }

  Skiplagged.prototype.flights = function(from, to, depart_date, return_date) {
  	var flightUrl = url;

    flightUrl += '?from='     +
                  from        +
                  '&to='      +
                  to          +
                  '&depart='  +
                  depart_date +
                  '&return='  +
                  return_date +
                  '&sort=cost';

  	request(flightUrl, function(error, response, body) {
  		if (!error && response.statusCode == 200) {
  			var $ = cheerio.load(body);
  	        return body;
    		}
    		else {
    			return error;
    		}
  	});
  };

  module.exports = Skiplagged;
}());
