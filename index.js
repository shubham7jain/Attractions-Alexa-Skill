/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/
/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills
 * nodejs skill development kit.
 * This sample supports multiple lauguages. (en-US, en-GB, de-DE).
 * The Intent Schema, Custom Slots and Sample Utterances for this skill, as well
 * as testing instructions are located at https://github.com/alexa/skill-sample-nodejs-fact
 **/

'use strict';

const Alexa = require('alexa-sdk');
var https = require('https');
var sum = require("sum");

var googleMapsClient = require('@google/maps').createClient({
    key: 'AIzaSyBECFKZZR8b2b_-lABFGU4DmoIoc7LCrnw'
});

const APP_ID = undefined;  // TODO replace with your app ID (OPTIONAL).

var placeCount = 5;


const handlers = {
    'LaunchRequest': function () {
        this.emit('GetFact');
    },
    'GetDetails': function() {
        // var filledSlots = delegateSlotCollection.call(this);

        var poi = this.event.request.intent.slots.poi.value;

        var self = this;

        googleMapsClient.places({
            query : poi,
            language: 'en'
        }, function(err, response) {
            if (!err) {
                var placeid = response.json.results[0].place_id;
                googleMapsClient.place({
                    placeid : placeid,
                    language: 'en'
                }, function(err, response) {
                    var speechOutput = "";
                    if (!err) {
                        var name = response.json.result.name;
                        var address = response.json.result.formatted_address;
                        var phone = response.json.result.formatted_phone_number;
                        var rating = response.json.result.rating;
                        speechOutput = name  + ' is located at ' + address + '. The phone number is ' + phone + ' and the rating for this place is ' + rating + '.';
                        if(response.json.result.reviews !== undefined){
                            var review = response.json.result.reviews[0];
                            var abstract = sum({ 'corpus': review.text , 'nSentences':2});
                            speechOutput += " The description of "+ name + " as given by " + review.author_name + " in his review with rating of " + review.rating + " is as :  '"  + abstract.summary + "'";
                        }
                    }


                    self.emit(':tellWithCard', speechOutput);
                });
            }
        });
    },
    'GetPlan': function() {
        var city = this.event.request.intent.slots.city.value;
        var dateVal = this.event.request.intent.slots.dateVal.value;
        var startTime = getTimeInSeconds(this.event.request.intent.slots.startTime.value);
        var endTime = getTimeInSeconds(this.event.request.intent.slots.endTime.value);
        var currentLocation = this.event.request.intent.slots.currentLocation.value;

        console.log('city is ' + city);

        var self = this;

        function getDayFromDate(dateString){
            var date = new Date(dateString);
            return (date.getDay()+1)%7;
        }

        function getTimeInSeconds(time) {
            var splits = time.split(':');
            var time = splits[0] * 60 * 60 + splits[1] * 60;

            return parseInt(time);
        }

        function getpoiRatingsMap(city, callback) {
            var self = this;

            var sortable = [];
            googleMapsClient.places({
                query : city + ' Point of interest',
                language: 'en'
            }, function(err, response) {
                if (!err) {
                    for(var i=0; i<response.json.results.length; i++) {
                        sortable.push([response.json.results[i]["name"], response.json.results[i]["rating"]]);
                    }

                    sortable.sort(function(a, b)
                    {
                        return b[1]-a[1]; // compare numbers
                    });

                    console.log(sortable);
                    callback(sortable);
                }
            });
        }

        function getTimeWindowFromPlaceId(placeid, callback) {
            googleMapsClient.place({
                placeid : placeid,
                language: 'en'
            }, function(err, response) {
                var returnVal = [];
                if (!err) {
                    if(response.json.result.opening_hours === undefined || response.json.result.opening_hours.periods.length < 7){
                        for (var j = 0; j<7; j++) {
                            returnVal[j] = [0, 86400];
                        }
                    }else {
                        var timings = response.json.result.opening_hours.periods;
                        for(var j = 0; j < timings.length; j++) {
                            var openDay = timings[j].open.day;
                            var closeDay = timings[j].close.day;
                            var openSecs = getTimeInSeconds(timings[j].open.time.slice(0, 2) + ':' +
                                timings[j].open.time.slice(2, 4));
                            var differenceDay = closeDay - openDay;
                            if (differenceDay < 0) {
                                differenceDay = 7 + differenceDay;
                            }
                            var closeDayAdditions = differenceDay * 86400;
                            var closeSecs = closeDayAdditions + getTimeInSeconds(timings[j].close.time.slice(0, 2) + ':' +
                                timings[j].close.time.slice(2, 4));

                            returnVal[j] = [openSecs, closeSecs];
                        }
                    }
                }
                callback(returnVal);
            });
        }

        function getTimeWindow(location, city, callback) {
            googleMapsClient.places({
                query : location + ', ' + city,
                language: 'en'
            }, function(err, response) {
                if (!err) {
                    var placeid = response.json.results[0].place_id;
                    getTimeWindowFromPlaceId(placeid, function (window) {
                        callback(window);
                    });
                }
            });
        }
        function getTimeWindowArray(poiRatings, city, currentLocation, callback) {
            var locations = [];
            for(var i=0; i<placeCount; i++){
                locations[i] = poiRatings[i][0] + ', ' + city;
            }
            console.log("Locations "+ locations);
            var timeWindowArray = [];
            timeWindowArray.push([]);

            locations.forEach(function(location) {
                getTimeWindow(location, city, function (windowArray) {
                    timeWindowArray.push(windowArray);
                    console.log(location);
                    if(timeWindowArray.length === locations.length + 1) {
                        callback(timeWindowArray);
                    }
                });
            });
        }

        function getDistanceTimeMatrix(poiRatings, city, currentLocation, callback) {
            var locations = [];
            locations[0] = currentLocation + ',' + city;
            console.log(poiRatings);
            for(var i=0; i<placeCount; i++){
                locations[i+1] = poiRatings[i][0] + ', ' + city;
            }
            var distanceMatrix = [];
            googleMapsClient.distanceMatrix({
                origins : locations,
                destinations : locations
            }, function(err, response){
                for(var i=0; i<response.json.rows.length; i++){
                    distanceMatrix[i] = [];
                    console.log(response.json.rows[i].elements);
                    for(var j=0; j < response.json.rows[i].elements.length; j++){
                        distanceMatrix[i][j] = [response.json.rows[i].elements[j]["distance"]["value"], response.json.rows[i].elements[j]["duration"]["value"]];
                    }
                }
                console.log(distanceMatrix);

                callback(distanceMatrix);
            });
        }

        var result = [];

        function isNothingToVisit(visited) {
            for(var i = 0; i < visited.length; i++) {
                if(!visited[i]) {
                    return false;
                }
            }

            return true;
        }

        function isNotPossibleToVisit(visited, currTime, distanceTimeMatrix, startTime, endTime, currentPoint, timeWindowArray, startPoint, day) {
            for(var i = 0; i < visited.length; i++) {
                if(!visited[i]) {
                    if(currTime + distanceTimeMatrix[currentPoint][i][1] >= timeWindowArray[i][day][0]
                        && currTime + distanceTimeMatrix[currentPoint][i][1] + 2*60*60 <= timeWindowArray[i][day][1]
                        && currTime + distanceTimeMatrix[currentPoint][i][1] + 2*60*60 + distanceTimeMatrix[i][startPoint][1] <= endTime) {
                        return false;
                    }
                }
            }

            return true;
        }

        function dfs(visited, distanceTimeMatrix, timeWindowArray, currDistance, currTime, endTime, startTime, currentPoint, startPoint, r, day) {
            // Base condition
            if(isNothingToVisit(visited) || isNotPossibleToVisit(visited, currTime, distanceTimeMatrix, startTime, endTime, currentPoint, timeWindowArray, startPoint, day)) {
                result.push([JSON.parse(JSON.stringify(r)), currDistance, currTime - startTime]);
                return;
            } else {
                for(var i = 0; i < visited.length; i++) {
                    if(!visited[i]) {
                        if(currTime + distanceTimeMatrix[currentPoint][i][1] < timeWindowArray[i][day][0]
                            || currTime + distanceTimeMatrix[currentPoint][i][1] + 2*60*60 > timeWindowArray[i][day][1]) {
                            continue;
                        }


                        visited[i] = true;
                        r.push(i);
                        dfs(visited, distanceTimeMatrix, timeWindowArray, currDistance + distanceTimeMatrix[currentPoint][i][0],
                            currTime + distanceTimeMatrix[currentPoint][i][1] + 2*60*60, endTime, startTime, i, startPoint, r, day);
                        visited[i] = false;
                        r.splice(-1, 1);
                    }
                }
            }
        }
        function computeResult(result, poiRatings, distanceTimeMatrix){
            var maxPathResult = -100000;
            var maxPath;
            var maxCovered = 0;
            for(var i=0; i<result.length; i++){
                var pathResult = 0;
                var rating = 0;
                var ratingCoefficient = 1200;
                var distanceCoefficient = -0.5;
                var timeCoefficient = -0.5;
                for(var j=0; j<result[i][0].length; j++){
                    var index = result[i][0][j];
                    rating += poiRatings[index-1][1];
                }
                pathResult = (ratingCoefficient * rating) + (distanceCoefficient * result[i][1])+ (timeCoefficient * result[i][2]);
                if((result[i][0].length > maxCovered) ||(( result[i][0].length === maxCovered)&& pathResult > maxPathResult)) {
                    maxPathResult = pathResult;
                    maxPath = result[i][0];
                    maxCovered = result[i][0].length;
                }
                result[i][3] = pathResult;
            }
            return maxPath;
        }

        function getLocationsFromPath(poiRatings, maxPath, city){
            var output = "Following is the order for the travel plan of " + city + " : ";
            for(var i=0; i<maxPath.length; i++) {
                output += (i+1).toString() +  ". " + poiRatings[maxPath[i]-1][0]+ ", ";
            }
            return output;
        }

        getpoiRatingsMap(city, function(poiRatings) {
            getTimeWindowArray(poiRatings, city, currentLocation, function(timeWindowArray) {
                getDistanceTimeMatrix(poiRatings, city, currentLocation, function(distanceTimeMatrix) {

                    console.log('timeWindowArray : ', timeWindowArray);
                    console.log('distanceTimeMatrix : ', distanceTimeMatrix);
                    var visited = [];

                    for(var i = 0; i < placeCount + 1; i++) {
                        visited.push(false);
                    }

                    visited[0] = true;

                    var day = getDayFromDate(dateVal);
                    var day = 1;
                    dfs(visited, distanceTimeMatrix, timeWindowArray, 0, startTime, endTime, startTime, 0, 0, [], day);
                    console.log(result);
                    var maxPath = computeResult(result, poiRatings, distanceTimeMatrix);
                    console.log(maxPath);
                    var output = getLocationsFromPath(poiRatings, maxPath, city);
                    console.log(output);

                    self.emit(':tellWithCard', output);
                });

            });

        });

    },
    'GetPointOfInterest': function () {
        this.emit('GetPois');
    },
    'GetPois': function () {
        var sortable = [];
        var output = "";
        var city = this.event.request.intent.slots.city.value;

        console.log('The city is ' + city);

        var self = this;

        googleMapsClient.places({
            query : city + ' Point of interest',
            language: 'en'
        }, function(err, response) {
            if (!err) {
                for(var i=0; i<response.json.results.length; i++) {
                    sortable.push([response.json.results[i]["name"], response.json.results[i]["rating"]]);
                }

                sortable.sort(function(a, b)
                {
                    return b[1]-a[1]; // compare numbers
                });

                console.log(sortable);
                output = "Top places to visit in " + city + " are : ";
                for(var i=0; i<placeCount; i++){
                    if (i === placeCount-1){
                        output += sortable[i][0] + " with rating " + sortable[i][1] + " .";
                    }else {
                        output += sortable[i][0] + " with rating " + sortable[i][1] + ", ";
                    }
                }

                console.log(output);
            }

            var speechOutput = output;
            self.emit(':tellWithCard', speechOutput);
        });
    },
    'AMAZON.HelpIntent': function () {
        const speechOutput = this.t('HELP_MESSAGE');
        const reprompt = this.t('HELP_MESSAGE');
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', this.t('STOP_MESSAGE'));
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', this.t('STOP_MESSAGE'));
    },
};

// function delegateSlotCollection(){
//     console.log("in delegateSlotCollection");
//     console.log("current dialogState: "+ this.event.request.dialogState);
//     if (this.event.request.dialogState === "STARTED") {
//         console.log("in Beginning");
//         var updatedIntent=this.event.request.intent;
//         //optionally pre-fill slots: update the intent object with slot values for which
//         //you have defaults, then return Dialog.Delegate with this updated intent
//         // in the updatedIntent property
//         this.emit(":delegate", updatedIntent);
//     } else if (this.event.request.dialogState !== "COMPLETED") {
//         console.log("in not completed");
//         // return a Dialog.Delegate directive with no updatedIntent property.
//         this.emit(":delegate");
//     } else {
//         console.log("in completed");
//         console.log("returning: "+ JSON.stringify(this.event.request.intent));
//         // Dialog is now complete and all required slots should be filled,
//         // so call your normal intent handler.
//         return this.event.request.intent;
//     }
// }

exports.handler = function (event, context) {
    const alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};