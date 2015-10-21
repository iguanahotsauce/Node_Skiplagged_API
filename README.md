# Node_Skiplagged_API
A node.js wrapper for the [Skiplagged](http://skiplagged.com) API
# Installation
```sh
npm install . -g
```
# Usage
```javascript
var Flights = require('flights');
var CurrentFlight = new Flights('FROM', 'TO', 'SORT', RESULTS, 'DEPARTURE_DATE');
```
# Variables
## Required
| Variable Name  | Datatype | Description
|----------------|----------|-----------------------------------------------------------------------------
| FROM           | string   | Departure Airport IATA Code
| TO             | string   | Arrival Airport IATA Code
| SORT           | string   | 'cost' Sorts by Cost Low to High<br>'duration' Sorts by Flight Duration Low to High<br>'path' Sorts by Number of Legs in Flight Low to High
| REULTS         | int      | 1 to Return First Result<br>0 to Return All Results
| DEPARTURE_DATE | string   | Departure Date in YYYY-MM-DD format

# Example
```javascript
var Flights = require('flights');
var CurrentFlight = new Flights('PDX', 'JFK', 'cost', 1, '2015-10-25');

CurrentFlight.getFlightData(function(error, body) {
  body = JSON.stringify(body, undefined, 4);
  console.log(body);
});
```
# Sample Response
```json
[
    {
        "price": "$194.90",
        "duration": "10 Hours 15 Minutes",
        "departure_time": "Sunday, October 25th 2015, 07:53pm",
        "arrival_time": "Monday, October 26th 2015, 11:47am",
        "legs": [
            {
                "airline": "Delta Air Lines",
                "flight_number": "DL1194",
                "duration": "1 Hour 42 Minutes",
                "departing_from": "Portland Intl, PDX",
                "departure_time": "Sunday, October 25th 2015, 07:53pm",
                "arriving_at": "Salt Lake City Intl, SLC",
                "arrival_time": "Sunday, October 25th 2015, 09:35pm"
            },
            {
                "airline": "Delta Air Lines",
                "flight_number": "DL1264",
                "duration": "4 Hours 23 Minutes",
                "departing_from": "Salt Lake City Intl, SLC",
                "departure_time": "Monday, October 26th 2015, 01:45am",
                "arriving_at": "John F Kennedy Intl, JFK",
                "arrival_time": "Monday, October 26th 2015, 06:08am"
            },
            {
                "airline": "Delta Air Lines",
                "flight_number": "DL457",
                "duration": "3 Hours 12 Minutes",
                "departing_from": "John F Kennedy Intl, JFK",
                "departure_time": "Monday, October 26th 2015, 08:35am",
                "arriving_at": "Lynden Pindling Intl, NAS",
                "arrival_time": "Monday, October 26th 2015, 11:47am"
            }
        ]
    }
]
```
# License
[The MIT License](LICENSE)
