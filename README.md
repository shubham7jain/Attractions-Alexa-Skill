# Attractions Alexa Skill

Attractions is a alexa skill made for knowing about any point of interest in the city. Apart from knowing, it can help you make the best optimized trip for a day in a city when you are short in time. This is made as we see lot of travellers facing difficulties while deciding what all places should he/she should visit in the city and how. It provides following functionalities :-
1. Provides the top points of interest/attractions by the city(You can ask Alexa : "Alexa ask Attractions to find the best places in New York to visit." and then Alexa would reply something like : "")
2. Provides the brief information about the Point of Interest with telephone number and its address.
3. Automatically plans a trip based on the best places in the city that can be covered in a single day. The algorithm finds the order of places to travel. It is calculated using the variation of Travelling Salesman Problem. It considers following factors while finding the best optimized route while following user creiterias/restrictions:-
	i. time at which users wants to start the trip/end the trip.
	ii.  day on which users wants to do the trip.
	iii. maximum place of interests covered in the given bound of time.
	iv. time at which places are opened and closed.
	v. rating of the places
	vi. a careful consideration has been given to balance between the rating of the place of interest and the feasibility to cover the place of interest.
	vii. currently, we take the 5 best places of interest in the 
	So, this algorithm is doing much more than the distance and time optimization which is normally done by most trip planner.

We have used google places api for multiple purposes in the alexa skill :-
1. Get the list of best places by city.
2. Get the place details from placeid.
3. Get the placeid from place name.
4. Get the distance matrix for the set of places.
5. Get the open and close timings of different places.

Hope you like our project and feel free to give us a feedback.
