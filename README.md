[![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-url]][daviddm-image]

Node_Skiplagged_API
===================
A node.js wrapper for the [Skiplagged](http://skiplagged.com) API

Table of Contents
=================
 * [Installation](#installation)
 * [Usage](#usage)
   * [Cheapest Flight](#cheapest-flight)
   * [Shortest Flight](#shortest-flight)
   * [Least Layovers](#least-layovers)
   * [Hidden City Flights](#hidden-city-flights)
   * [Database Tracking of Flights](#database-tracking-of-flights)
 * [Config](#config)

Installation
============
```sh
npm install . -g
```
Usage
=====
```javascript
var Flights = require('flights');
var CurrentFlight = new Flights(data);
```

Cheapest Flight
---------------

Shortest Flight
---------------

Least Layovers
--------------

Hidden City Flights
-------------------

Database Tracking of Flights
----------------------------

Config
======
Example of the config.js file

```javascript
var config = module.exports = {};

config.MYSQL = {
	DATABASE: 'flight_data',
	USERNAME: username,
	PASSWORD: password,
	HOST: host
};
config.EMAIL = {
	SERVICE: service, // (ex. 'Gmail')
	USER: user,
	PASSWORD: password,
	NAME: name, // Your First Name
	TO: email // Email you want to send the flight price emails to
};
```
# Variables
## Required
| Variable Name  | Datatype | Description
|----------------|----------|-----------------------------------------------------------------------------
| FROM           | string   | Departure Airport IATA Code
| TO             | string   | Arrival Airport IATA Code
| DEPARTURE_DATE | string   | Departure Date in YYYY-MM-DD format
##Optional
| Variable Name    | Datatype  | Default | Description
|------------------|---------- |---------|--------------------------------------------------------------------
| SORT             | string    | 'cost'  | 'cost' Sorts by Cost Low to High<br>'duration' Sorts by Flight Duration Low to High<br>'path' Sorts by Number of Legs in Flight Low to High
| RESULTS          | int       | 1       | 1 to Return First Result<br>0 to Return All Results
| SKIP_HIDDEN_CITY | boolean   | true    | Removes all Hidden City Flights From the Results
#Hidden City Ticketing
Hidden city ticketing occurs when a passenger disembarks an indirect flight at the connection node. Flight fares are subject to market forces, and therefore do not necessarily correlate to the distance flown. As a result, a flight between point A to point C, with a connection node at point B, might be cheaper than a flight between point A and point B. It is then possible to purchase a flight ticket from point A to point C, disembark at the connection node (B) and discard the remaining segment (B to C).

Using the hidden city tactic is usually practical only for one-way trips, as the airlines will cancel the subsequent parts of the trip once a traveler has disembarked. Thus, round-trip itineraries need to be created by piecing two one-way flights together. This tactic also requires that the traveler have carry-on luggage only, as any checked baggage items will be unloaded only at the flight's ticketed final destination.

[Wikipedia](https://en.wikipedia.org/wiki/Airline_booking_ploys#Hidden_city_ticketing)
# Example
##Normal Flight
```javascript
var Flights = require('flights');

var data = {
  FROM: 'PDX',
  TO: 'JFK',
  DEPARTURE_DATE: '2015-10-25'
};

var CurrentFlight = new Flights(data);

CurrentFlight.getFlightData(function(error, body) {
  body = JSON.stringify(body, undefined, 4);
  console.log(body);
});
```
### Response
```json
[
    {
        "price": "$230.50",
        "duration": "7 Hours 36 Minutes",
        "departure_time": "Sunday, October 25th 2015, 03:25am",
        "arrival_time": "Sunday, October 25th 2015, 11:01am",
        "legs": [
            {
                "airline": "American Airlines",
                "flight_number": "AA1905",
                "duration": "4 Hours 49 Minutes",
                "departing_from": "Portland Intl, PDX, Portland, United States",
                "departure_time": "Sunday, October 25th 2015, 03:25am",
                "arriving_at": "Charlotte Douglas Intl, CLT, Charlotte, United States",
                "arrival_time": "Sunday, October 25th 2015, 08:14am"
            },
            {
                "airline": "American Airlines",
                "flight_number": "AA1830",
                "duration": "1 Hour 46 Minutes",
                "departing_from": "Charlotte Douglas Intl, CLT, Charlotte, United States",
                "departure_time": "Sunday, October 25th 2015, 09:15am",
                "arriving_at": "John F Kennedy Intl, JFK, New York, United States",
                "arrival_time": "Sunday, October 25th 2015, 11:01am"
            }
        ]
    }
]
```
##Hidden City Flight
```javascript
var Flights = require('flights');

var data = {
  FROM: 'PDX',
  TO: 'JFK',
  DEPARTURE_DATE: '2015-10-25',
  SKIP_HIDDEN_CITY: false
};

var CurrentFlight = new Flights(data);

CurrentFlight.getFlightData(function(error, body) {
  body = JSON.stringify(body, undefined, 4);
  console.log(body);
});
```
### Response
```json
[
    {
        "price": "$189.30",
        "duration": "8 Hours 41 Minutes",
        "departure_time": "Sunday, October 25th 2015, 09:27pm",
        "arrival_time": "Monday, October 26th 2015, 11:47am",
        "legs": [
            {
                "airline": "Delta Air Lines",
                "flight_number": "DL2389",
                "duration": "1 Hour 43 Minutes",
                "departing_from": "Portland Intl, PDX, Portland, United States",
                "departure_time": "Sunday, October 25th 2015, 09:27pm",
                "arriving_at": "Salt Lake City Intl, SLC, Salt Lake City, United States",
                "arrival_time": "Sunday, October 25th 2015, 11:10pm"
            },
            {
                "airline": "Delta Air Lines",
                "flight_number": "DL1264",
                "duration": "4 Hours 23 Minutes",
                "departing_from": "Salt Lake City Intl, SLC, Salt Lake City, United States",
                "departure_time": "Monday, October 26th 2015, 01:45am",
                "arriving_at": "John F Kennedy Intl, JFK, New York, United States",
                "arrival_time": "Monday, October 26th 2015, 06:08am"
            },
            {
                "airline": "Delta Air Lines",
                "flight_number": "DL457",
                "duration": "3 Hours 12 Minutes",
                "departing_from": "John F Kennedy Intl, JFK, New York, United States",
                "departure_time": "Monday, October 26th 2015, 08:35am",
                "arriving_at": "Lynden Pindling Intl, NAS, Nassau, Bahamas",
                "arrival_time": "Monday, October 26th 2015, 11:47am"
            }
        ]
    }
]
```
## Database Tracking
With the Database Tracking functionality you can set SAVE_TO_DATABSE equal to true in your data object and the flight data will be saved to a mysql database. Every five minutes there will be a new request made to the [Skiplagged](http://skiplagged.com) API to retrieve new flight data.

Every time new flight data is retrieved the flight price will be compared against the saved flight prices in the database and if the new flight price is below the price trend an email will be sent to the email address that is set in the config file saying that the prices have dropped and now is a good time to book the flight.

Data will be collected for the number of days set in the config file, DAYS_BEFORE_COMPARISON, before sending the price emails so that a good base line is set.

```javascript
var Flights = require('../index');
var config = require('./config');

var data = {
  FROM: 'PDX',
  TO: 'JFK',
  DEPART_DATE: '2016-06-01',
  SKIP_HIDDEN_CITY: false,
  SAVE_TO_DATABASE: true,
  CONFIG: config
};

var CurrentFlight = new Flights(data);
```
# License
[The MIT License](LICENSE)

[travis-url]: https://travis-ci.org/iguanahotsauce/Node_Skiplagged_API
[travis-image]: https://travis-ci.org/iguanahotsauce/Node_Skiplagged_API.svg?branch=master
[daviddm-url]: https://david-dm.org/iguanahotsauce/Node_Skiplagged_API.svg?theme=shields.io
[daviddm-image]: https://david-dm.org/iguanahotsauce/Node_Skiplagged_API
