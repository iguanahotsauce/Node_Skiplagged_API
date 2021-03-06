[![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-url]][daviddm-image]

Node_Skiplagged_API
===================
A node.js wrapper for the [Skiplagged](http://skiplagged.com) API

Update coming soon

Table of Contents
=================
 * [Installation](#installation)
 * [Variables](#variables)
   * [Required](#required)
   * [Optional](#optional)
 * [Config](#config)
 * [Database Schema](#database-schema)
   * [Database Name](#database-name)
   * [Table Names](#table-names)
   * [Table Schema](#table-schema)
 * [Usage](#usage)
   * [Cheapest Flight](#cheapest-flight)
     * [Example](#example)
     * [Response](#response)
   * [Shortest Flight](#shortest-flight)
     * [Example](#example-1)
     * [Response](#response-1)
   * [Least Layovers](#least-layovers)
     * [Example](#example-2)
     * [Response](#response-2)
   * [Setting a Specific Departure Time](#setting-a-specific-departure-time)
     * [Example](#example-3)
     * [Response](#response-3)
   * [Hidden City Flights](#hidden-city-flights)
     * [Example](#example-4)
     * [Response](#response-4)
   * [Database Tracking of Flights](#database-tracking-of-flights)
     * [Example](#example-5)
 * [License](#license)

Installation
============
```sh
$ npm install . -g
```
Variables
=========
Required
--------
| Variable Name  | Datatype | Description
|----------------|----------|-----------------------------------------------------------------------------
| FROM           | string   | Departure Airport IATA Code
| TO             | string   | Arrival Airport IATA Code
| DEPARTURE_DATE | string   | Departure Date in YYYY-MM-DD format
Optional
--------
| Variable Name      | Datatype  | Default | Description
|--------------------|---------- |---------|--------------------------------------------------------------------
| SORT               | string    | 'cost'  | 'cost' Sorts by Cost Low to High<br>'duration' Sorts by Flight Duration Low to High<br>'path' Sorts by Number of Legs in Flight Low to High
| RESULTS            | integer   | 1       | 1 to Return First Result<br>0 to Return All Results
| SKIP_HIDDEN_CITY   | boolean   | true    | Removes all Hidden City Flights From the Results
| CONFIG             | object    | {}      | Object that stores data for mysql login and email login
| MIN_PERCENT_CHANGE | float     | 0       | The percent change needed between the lowest flight price and the current flight price to send an email
| FLIGHT_TIME        | integer   | 0       | The time you want to set for the departure time to be before or after<br>1 - 24 for the hour of the day
| BEFORE_OR_AFTER    | string    | null    | 'BEFORE' to only find flights before the FLIGHT_TIME hour set<br>'AFTER' to only find flights after the FLIGHT_TIME hour set
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
Database Schema
===============
Database Name
--------
```mysql
flight_data
```
Table Names
------
```mysql
flights
trips
```
Table Schema
------------
```mysql
mysql> desc flights;
+-----------------+--------------+------+-----+---------+----------------+
| Field           | Type         | Null | Key | Default | Extra          |
+-----------------+--------------+------+-----+---------+----------------+
| flight_id       | mediumint(9) | NO   | PRI | NULL    | auto_increment |
| flight_key      | varchar(7)   | NO   |     | NULL    |                |
| flight_key_long | varchar(192) | NO   |     | NULL    |                |
| duration        | mediumint(9) | NO   |     | NULL    |                |
| price           | mediumint(9) | NO   |     | NULL    |                |
| from_iata       | varchar(5)   | NO   |     | NULL    |                |
| to_iata         | varchar(5)   | NO   |     | NULL    |                |
| departure_date  | datetime     | NO   |     | NULL    |                |
| insert_date     | datetime     | NO   |     | NULL    |                |
| current_low     | varchar(1)   | NO   |     | N       |                |
+-----------------+--------------+------+-----+---------+----------------+

mysql> desc trips;
+------------------------+--------------+------+-----+---------------------+-----------------------------+
| Field                  | Type         | Null | Key | Default             | Extra                       |
+------------------------+--------------+------+-----+---------------------+-----------------------------+
| trip_id                | mediumint(9) | NO   | PRI | NULL                | auto_increment              |
| flight_number          | varchar(10)  | NO   |     | NULL                |                             |
| airline                | varchar(100) | NO   |     | NULL                |                             |
| duration               | mediumint(9) | NO   |     | NULL                |                             |
| departure_airport_iata | varchar(5)   | NO   |     | NULL                |                             |
| departure_time         | timestamp    | NO   |     | CURRENT_TIMESTAMP   | on update CURRENT_TIMESTAMP |
| arrival_airport_iata   | varchar(5)   | NO   |     | NULL                |                             |
| arrival_time           | timestamp    | NO   |     | 0000-00-00 00:00:00 |                             |
| flight_id              | mediumint(9) | NO   | MUL | NULL                |                             |
+------------------------+--------------+------+-----+---------------------+-----------------------------+

```
Usage
=====
```javascript
var Flights = require('flights');
var CurrentFlight = new Flights(data);
```

Cheapest Flight
---------------
### Example
```javascript
var Flights = require('flights');

var data = {
  FROM: 'PDX',
  TO: 'JFK',
  DEPARTURE_DATE: '2016-06-01'
};

var CurrentFlight = new Flights(data);

CurrentFlight.getFlightData(function(error, body) {
  body = JSON.stringify(body, undefined, 4);
  console.log(body);
});
```
### Response
```json
{
    "flightData": [
        {
            "price": "$175.60",
            "price_pennies": 17560,
            "duration": "10 Hours 22 Minutes",
            "duration_seconds": 37320,
            "departure_time": "Wednesday, June 1st 2016, 10:59pm",
            "arrival_time": "Thursday, June 2nd 2016, 12:21pm",
            "legs": [
                {
                    "airline": "Delta Air Lines",
                    "flight_number": "DL1067",
                    "duration": "4 Hours 8 Minutes",
                    "duration_seconds": 14880,
                    "departing_from": "Portland Intl, PDX, Portland, United States",
                    "departure_time": "Wednesday, June 1st 2016, 10:59pm",
                    "departure_time_formatted": "2016-06-01T22:59:00-07:00",
                    "arriving_at": "Detroit Metro Wayne Co, DTW, Detroit, United States",
                    "arrival_time": "Thursday, June 2nd 2016, 06:07am",
                    "arrival_time_formatted": "2016-06-02T06:07:00-04:00"
                },
                {
                    "airline": "Delta Air Lines",
                    "flight_number": "DL1218",
                    "duration": "1 Hour 25 Minutes",
                    "duration_seconds": 5100,
                    "departing_from": "Detroit Metro Wayne Co, DTW, Detroit, United States",
                    "departure_time": "Thursday, June 2nd 2016, 07:33am",
                    "departure_time_formatted": "2016-06-02T07:33:00-04:00",
                    "arriving_at": "Ronald Reagan Washington Natl, DCA, Washington, United States",
                    "arrival_time": "Thursday, June 2nd 2016, 08:58am",
                    "arrival_time_formatted": "2016-06-02T08:58:00-04:00"
                },
                {
                    "airline": "Delta Air Lines",
                    "flight_number": "DL3901",
                    "duration": "1 Hour 21 Minutes",
                    "duration_seconds": 4860,
                    "departing_from": "Ronald Reagan Washington Natl, DCA, Washington, United States",
                    "departure_time": "Thursday, June 2nd 2016, 11:00am",
                    "departure_time_formatted": "2016-06-02T11:00:00-04:00",
                    "arriving_at": "John F Kennedy Intl, JFK, New York, United States",
                    "arrival_time": "Thursday, June 2nd 2016, 12:21pm",
                    "arrival_time_formatted": "2016-06-02T12:21:00-04:00"
                }
            ],
            "flight_key": "b38b98d",
            "flight_key_long": "4d7ded7b19fd4946b25526c94ef76a367c64194c4c7a40962fe9c3c8929b8f0c342145e4ad81d47583adb167d7eb66df19710f4d97a7531a5e5e83cc60c8624eb22eaa7994c1341c962d7016e47b88cda641311e446a3bd68e2714c1b1dbc2f6"
        }
    ]
}
```
Shortest Flight
---------------
### Example
```javascript
var Flights = require('flights');

var data = {
  FROM: 'PDX',
  TO: 'JFK',
  DEPARTURE_DATE: '2016-06-01',
  SORT: 'duration'
};

var CurrentFlight = new Flights(data);

CurrentFlight.getFlightData(function(error, body) {
  body = JSON.stringify(body, undefined, 4);
  console.log(body);
});
```
### Response
```json

    "flightData": [
        {
            "price": "$181.10",
            "price_pennies": 18110,
            "duration": "5 Hours 20 Minutes",
            "duration_seconds": 19200,
            "departure_time": "Wednesday, June 1st 2016, 06:00am",
            "arrival_time": "",
            "legs": [
                {
                    "airline": "Delta Air Lines",
                    "flight_number": "DL735",
                    "duration": "5 Hours 20 Minutes",
                    "duration_seconds": 19200,
                    "departing_from": "Portland Intl, PDX, Portland, United States",
                    "departure_time": "Wednesday, June 1st 2016, 06:00am",
                    "departure_time_formatted": "2016-06-01T06:00:00-07:00",
                    "arriving_at": "John F Kennedy Intl, JFK, New York, United States",
                    "arrival_time": "Wednesday, June 1st 2016, 02:20pm",
                    "arrival_time_formatted": "2016-06-01T14:20:00-04:00"
                }
            ],
            "flight_key": "e426142",
            "flight_key_long": "230be59fb91c9257bc546e3d8ddc621ba49444ed90a0dbfaa0cbbe07ba4c28e418472b2910486da4ee5f0eae220994110f11e453b00b28473277d9171cd4fe2cbb38c34ba75f2305687e7231ac6c1712c5b022ed880f942320d3a3267d8d0ec3"
        }
    ]
}
```
Least Layovers
--------------
### Example
```javascript
var Flights = require('flights');

var data = {
  FROM: 'PDX',
  TO: 'JFK',
  DEPARTURE_DATE: '2016-06-01',
  SORT: 'path'
};

var CurrentFlight = new Flights(data);

CurrentFlight.getFlightData(function(error, body) {
  body = JSON.stringify(body, undefined, 4);
  console.log(body);
});
```
### Response
```json
{
    "flightData": [
        {
            "price": "$181.10",
            "price_pennies": 18110,
            "duration": "5 Hours 20 Minutes",
            "duration_seconds": 19200,
            "departure_time": "Wednesday, June 1st 2016, 06:00am",
            "arrival_time": "",
            "legs": [
                {
                    "airline": "Delta Air Lines",
                    "flight_number": "DL735",
                    "duration": "5 Hours 20 Minutes",
                    "duration_seconds": 19200,
                    "departing_from": "Portland Intl, PDX, Portland, United States",
                    "departure_time": "Wednesday, June 1st 2016, 06:00am",
                    "departure_time_formatted": "2016-06-01T06:00:00-07:00",
                    "arriving_at": "John F Kennedy Intl, JFK, New York, United States",
                    "arrival_time": "Wednesday, June 1st 2016, 02:20pm",
                    "arrival_time_formatted": "2016-06-01T14:20:00-04:00"
                }
            ],
            "flight_key": "e426142",
            "flight_key_long": "230be59fb91c9257bc546e3d8ddc621ba49444ed90a0dbfaa0cbbe07ba4c28e418472b2910486da4ee5f0eae220994110f11e453b00b28473277d9171cd4fe2cbb38c34ba75f2305687e7231ac6c1712c5b022ed880f942320d3a3267d8d0ec3"
        }
    ]
}
```
Setting a Specific Departure Time
---------------------------------
With the FLIGHT_TIME and BEFORE_OR_AFTER variables set you can search for flights that are before or after the FLIGHT_TIME hour that you set

### Example
```javascript
var Flights = require('flights');

var data = {
  FROM: 'PDX',
  TO: 'JFK',
  DEPARTURE_DATE: '2016-06-01',
  FLIGHT_TIME: 22,
  BEFORE_OR_AFTER: 'AFTER'
};

var CurrentFlight = new Flights(data);

CurrentFlight.getFlightData(function(error, body) {
  body = JSON.stringify(body, undefined, 4);
  console.log(body);
});
```
### Response
```json
{
    "flightData": [
        {
            "price": "$175.60",
            "price_pennies": 17560,
            "duration": "10 Hours 22 Minutes",
            "duration_seconds": 37320,
            "departure_time": "Wednesday, June 1st 2016, 10:59pm",
            "arrival_time": "Thursday, June 2nd 2016, 12:21pm",
            "legs": [
                {
                    "airline": "Delta Air Lines",
                    "flight_number": "DL1067",
                    "duration": "4 Hours 8 Minutes",
                    "duration_seconds": 14880,
                    "departing_from": "Portland Intl, PDX, Portland, United States",
                    "departure_time": "Wednesday, June 1st 2016, 10:59pm",
                    "departure_time_formatted": "2016-06-01T22:59:00-07:00",
                    "arriving_at": "Detroit Metro Wayne Co, DTW, Detroit, United States",
                    "arrival_time": "Thursday, June 2nd 2016, 06:07am",
                    "arrival_time_formatted": "2016-06-02T06:07:00-04:00"
                },
                {
                    "airline": "Delta Air Lines",
                    "flight_number": "DL1218",
                    "duration": "1 Hour 25 Minutes",
                    "duration_seconds": 5100,
                    "departing_from": "Detroit Metro Wayne Co, DTW, Detroit, United States",
                    "departure_time": "Thursday, June 2nd 2016, 07:33am",
                    "departure_time_formatted": "2016-06-02T07:33:00-04:00",
                    "arriving_at": "Ronald Reagan Washington Natl, DCA, Washington, United States",
                    "arrival_time": "Thursday, June 2nd 2016, 08:58am",
                    "arrival_time_formatted": "2016-06-02T08:58:00-04:00"
                },
                {
                    "airline": "Delta Air Lines",
                    "flight_number": "DL3901",
                    "duration": "1 Hour 21 Minutes",
                    "duration_seconds": 4860,
                    "departing_from": "Ronald Reagan Washington Natl, DCA, Washington, United States",
                    "departure_time": "Thursday, June 2nd 2016, 11:00am",
                    "departure_time_formatted": "2016-06-02T11:00:00-04:00",
                    "arriving_at": "John F Kennedy Intl, JFK, New York, United States",
                    "arrival_time": "Thursday, June 2nd 2016, 12:21pm",
                    "arrival_time_formatted": "2016-06-02T12:21:00-04:00"
                }
            ],
            "flight_key": "b38b98d",
            "flight_key_long": "4d7ded7b19fd4946b25526c94ef76a367c64194c4c7a40962fe9c3c8929b8f0c342145e4ad81d47583adb167d7eb66df19710f4d97a7531a5e5e83cc60c8624eb22eaa7994c1341c962d7016e47b88cda641311e446a3bd68e2714c1b1dbc2f6"
        }
    ]
}
```
Hidden City Flights
-------------------
Hidden city ticketing occurs when a passenger disembarks an indirect flight at the connection node. Flight fares are subject to market forces, and therefore do not necessarily correlate to the distance flown. As a result, a flight between point A to point C, with a connection node at point B, might be cheaper than a flight between point A and point B. It is then possible to purchase a flight ticket from point A to point C, disembark at the connection node (B) and discard the remaining segment (B to C).

Using the hidden city tactic is usually practical only for one-way trips, as the airlines will cancel the subsequent parts of the trip once a traveler has disembarked. Thus, round-trip itineraries need to be created by piecing two one-way flights together. This tactic also requires that the traveler have carry-on luggage only, as any checked baggage items will be unloaded only at the flight's ticketed final destination.

[Wikipedia](https://en.wikipedia.org/wiki/Airline_booking_ploys#Hidden_city_ticketing)

### Example
```javascript
var Flights = require('flights');

var data = {
  FROM: 'PDX',
  TO: 'JFK',
  DEPARTURE_DATE: '2016-06-01',
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
{
    "flightData": [
        {
            "price": "$112.60",
            "price_pennies": 11260,
            "duration": "5 Hours 13 Minutes",
            "duration_seconds": 18780,
            "departure_time": "Wednesday, June 1st 2016, 09:55pm",
            "arrival_time": "Thursday, June 2nd 2016, 10:07am",
            "legs": [
                {
                    "airline": "Delta Air Lines",
                    "flight_number": "DL1627",
                    "duration": "5 Hours 13 Minutes",
                    "duration_seconds": 18780,
                    "departing_from": "Portland Intl, PDX, Portland, United States",
                    "departure_time": "Wednesday, June 1st 2016, 09:55pm",
                    "departure_time_formatted": "2016-06-01T21:55:00-07:00",
                    "arriving_at": "John F Kennedy Intl, JFK, New York, United States",
                    "arrival_time": "Thursday, June 2nd 2016, 06:08am",
                    "arrival_time_formatted": "2016-06-02T06:08:00-04:00"
                },
                {
                    "airline": "Delta Air Lines",
                    "flight_number": "DL4022",
                    "duration": "1 Hour 22 Minutes",
                    "duration_seconds": 4920,
                    "departing_from": "John F Kennedy Intl, JFK, New York, United States",
                    "departure_time": "Thursday, June 2nd 2016, 08:45am",
                    "departure_time_formatted": "2016-06-02T08:45:00-04:00",
                    "arriving_at": "Ronald Reagan Washington Natl, DCA, Washington, United States",
                    "arrival_time": "Thursday, June 2nd 2016, 10:07am",
                    "arrival_time_formatted": "2016-06-02T10:07:00-04:00"
                }
            ],
            "flight_key": "02aeb3b",
            "flight_key_long": "4d7ded7b19fd4946b25526c94ef76a3634ed8fac852a28bece2368b73ee2800f342145e4ad81d47583adb167d7eb66df19710f4d97a7531a5e5e83cc60c8624e1ab655e8c04b940a225885a82b1f830654cb1f97b1f4a3a9cf7abda9e5873ed3"
        }
    ]
}
```
Database Tracking of Flights
----------------------------
With the Database Tracking functionality you can set SAVE_TO_DATABSE equal to true in your data object and the flight data for the cheapest flight in the sort order you have selected will be saved to a mysql database called flight_data. Every five minutes there will be a new request made to the [Skiplagged](http://skiplagged.com) API to retrieve new flight data.

Every time new flight data is retrieved the flight price will be compared against the flight saved in the database that has the current_low flag set to "Y". If the new flight price is greater or less than the MIN_PERCENT_CHANGE value that is set in the data object then an email will be sent to the email address listed in the config file saying that the current flight price has gone up or down accordingly. It will aslo tell you the difference between the current flight price and the all time low for the specific flight in the email. When an email is sent the row associated with that flight in the database will have the current_low flag set to "Y" and all other rows for the given flight will have the current_row flag set to "N"

You will need to use forever.js to keep the node script running continuestly.

### Example

```javascript
var Flights = require('../index');
var config = require('./config');

var data = {
  FROM: 'PDX',
  TO: 'JFK',
  DEPART_DATE: '2016-06-01',
  SAVE_TO_DATABASE: true,
  CONFIG: config
};

var CurrentFlight = new Flights(data);
```

```sh
$ forever start database_flight_tracking.js
```

License
=======
[The MIT License](LICENSE)

[travis-url]: https://travis-ci.org/iguanahotsauce/Node_Skiplagged_API
[travis-image]: https://travis-ci.org/iguanahotsauce/Node_Skiplagged_API.svg?branch=master
[daviddm-url]: https://david-dm.org/iguanahotsauce/Node_Skiplagged_API.svg?theme=shields.io
[daviddm-image]: https://david-dm.org/iguanahotsauce/Node_Skiplagged_API
