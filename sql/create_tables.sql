drop table flight_data.trips;
drop table flight_data.flights;
drop database flight_data;

create database flight_data;

create table flight_data.flights (
  flight_id MEDIUMINT NOT NULL AUTO_INCREMENT,
  flight_key VARCHAR(7) NOT NULL,
  flight_key_long VARCHAR(192) NOT NULL,
  duration MEDIUMINT NOT NULL,
  price MEDIUMINT NOT NULL,
  from_iata VARCHAR(5) NOT NULL,
  to_iata VARCHAR(5) NOT NULL,
  departure_date DATETIME NOT NULL,
  current_low VARCHAR(1) DEFAULT 'N' NOT NULL,
  hidden_city VARCHAR(1) NOT NULL,
  insert_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY(flight_id)
);

create table flight_data.trips (
  trip_id MEDIUMINT NOT NULL AUTO_INCREMENT,
  flight_number VARCHAR(10) NOT NULL,
  airline VARCHAR(100) NOT NULL,
  duration MEDIUMINT NOT NULL,
  departure_airport_iata VARCHAR(5) NOT NULL,
  departure_time TIMESTAMP NOT NULL,
  arrival_airport_iata VARCHAR(5) NOT NULL,
  arrival_time TIMESTAMP NOT NULL,
  flight_id MEDIUMINT NOT NULL,
  PRIMARY KEY(trip_id),
  FOREIGN KEY (flight_id)
    REFERENCES flights(flight_id)
    ON DELETE CASCADE
);
