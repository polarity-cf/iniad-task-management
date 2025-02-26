// Sidebar to navbar (Responsive)
let btn = document.querySelector("#collapse-btn");
let navbar = document.querySelector(".mobile-nav");
let content = document.querySelector(".content");

btn.onclick = function () {
    navbar.classList.toggle("active");
    content.classList.toggle("active");
}

// Date for today tab
let today = new Date();
let date = today.getFullYear() + '/' + (today.getMonth() + 1) + '/' + today.getDate();
document.querySelector(".today-date").innerHTML = date;

// Datepicker
$(function () {
    $("#id_date").datepicker({
        dateFormat: 'yy/mm/dd',
        changeMonth: true,
        changeYear: true,
    });
});

// Timepicker
$('#id_time').timepicki({
    show_meridian: false,
    start_time: ["00", "00"],
    max_hour_value: 23
});

// Calendar
document.addEventListener("DOMContentLoaded", function () {
    var calendarEl = document.getElementById("calendar");
    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialDate: today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate(),
        businessHours: true,
        dayMaxEvents: true,
        themeSystem: 'bootstrap',
        height: 400,
        // dateClick: function (info) {
        //     alert('Clicked on: ' + info.dateStr);
        //     alert('Coordinates: ' + info.jsEvent.pageX + ',' + info.jsEvent.pageY);
        //     alert('Current view: ' + info.view.type);
        //     // change the day's background color just for fun
        //     // info.dayEl.style.backgroundColor = 'red';
        // }
    });
    calendar.render();
});

class CalendarEvent {
    constructor(title, content, tag, notifyTime) {
        this.title = title;
        this.content = content;
        this.tag = tag;
        this.notifyTime = notifyTime;
    }

    getNotifyTime() {
        /**
         * Return the this.notifyTime
         */
        return this.notifyTime;
    }

    getTitle() {
        return this.title;
    }

    getContent() {
        return this.content;
    }

    getTag() {
        return this.tag;
    }
}

let eventFlow = []; //max 20 next event
let monthData = {}; // this moment for this year only, key is month ID year%month eg 2021%5
let dayData = {}; // this moment for this year only, key is day ID year%month%day eg 2021%10%19
let tagData = {}; // key is tag name, the event is sorted

let timeoutID; // ID for waiting for the event
let nextEvent; //next notified event, make this global is a bad programming behaviour, should use class

/**Pop up the input box */
function openPopup() {
    //alert("fired");
    document.getElementById("mycreateEventBox").classList.add("active");
}

/**Close the input box and clear all the input in*/
function onClose() {
    let createEventBox = document.getElementById("mycreateEventBox");
    let inputField = document.getElementsByClassName("my-input-field");

    createEventBox.classList.remove("active");
    for (let field of inputField) {
        field.value = "";
    }
}

/**Get the input data from user, return array in form [Title, date, time, content, tag]*/
function getInputData() {
    let inputField = document.getElementsByClassName("my-input-field");
    let result = [];
    for (let field of inputField) {
        console.log('Type of data: ', typeof(field.value));
        result.push(field.value);
    }
    return result
}

/**Make float notification */
function notifyEvent() {
    let title = nextEvent.getTitle();
    let message = nextEvent.getContent();
    var notification = new Notification(title, {
        body: message,
        icon: "static/images/clock_icon.png"
    });
    run();
}

/**This method return the color will be display of event title banner in Event Flow
 * The color depends on the urgency of event
 * if 1 day left -> red
 * if 1 < ... < 3 -> yellow
 * else green
*/
function setEventTitleBannerColor(eventObj) {
    let now = new Date();
    let eventNotifyTime = eventObj.getNotifyTime();
    if ((eventNotifyTime - now) < 1*24*60*60*1000) {
        //less than 1 day
        return "red";
    }
    else if ((eventNotifyTime - now) < 3*24*60*60*1000) {
        // more than 1 day but less than 3 days
        return "yellow";
    }
    else {
        return "green"
    }
}

/**This method create event title in event flow 
 * eventObj is the CalendarEvent object
 * use that to get the data for event title
*/
function createEventTitle(eventObj) {
    // alert("fired!")
    let title = eventObj.getTitle();
    let content = eventObj.getContent();
    let deadline = eventObj.getNotifyTime();

    let divCard = document.createElement("div");
    let divCardBody = document.createElement("div");
    let eventTitleBannerColor = setEventTitleBannerColor(eventObj);
    let heading = document.createElement("h5");
    let headtext = document.createTextNode(title);
    let eventFlowPane = document.getElementById("event-flow");

    divCard.classList.add("card", eventTitleBannerColor);
    divCard.appendChild(divCardBody);
    divCardBody.classList.add("card-body");
    heading.classList.add("card-title");
    heading.appendChild(headtext);
    divCardBody.appendChild(heading);

    eventFlowPane.appendChild(divCard);
}

function displayNoUpcomingEvent(parentElement) {
    // this is the <p> tag for display "There is no upcoming event" text
    let div = document.createElement("div");
    let img = document.createElement("i");
    let noUpcomingEvent = document.createElement("p");
    let text = document.createTextNode("There is no upcoming event!");
    
    div.classList.add("no-task");
    div.appendChild(img);
    div.appendChild(noUpcomingEvent);
    img.classList.add("fas", "fa-tasks");
    noUpcomingEvent.appendChild(text);

    parentElement.appendChild(div);
}

/**This method update the Event flow pane  
 * It will delete all current event in the Event Flow then create new Event title
*/
function updateEventFlow() {
    let eventFlowPane = document.getElementById("event-flow");
    let allEvent = eventFlowPane.childNodes;
    let allEventNumber = allEvent.length;
    console.log('Length of allEvent:', allEvent.length);
    console.log(allEvent); //0 if the first time
    // for (let event of allEvent) {
    //     eventFlowPane.removeChild(event);
    //     event.remove();
    // }
    if (allEventNumber === 0) {
        //do nothing
    }
    else {
    let firstEventTitle = eventFlowPane.firstElementChild;
    while (firstEventTitle) {
        firstEventTitle.remove();
        firstEventTitle = eventFlowPane.firstElementChild;
    }
    }
    for (let event of eventFlow) {
        createEventTitle(event);
    }
    if (eventFlow.length === 0) {
        displayNoUpcomingEvent(eventFlowPane);
    }
}

/**This function run when click save button, will create new Event and add that event to the store structure*/
function onSave() {
    let data = getInputData();
    // alert(data); //abc,abc,2021/10/23,0816,khan
    let title = data[0];
    let content = data[3];
    let tag = data[4];
    let datedata = data[1].split('/');
    console.log('datedata: ', datedata);
    console.log('type of datedata:', typeof(datedata));
    // alert(datedata); //2021,10,23
    let year = Number(datedata[0]);
    // alert(typeof(year)); //Number
    let month = Number(datedata[1]);
    let day = Number(datedata[2]);
    console.log('Time: ', data[3]);
    let hour = Number(data[2].slice(0, 2));
    console.log('Hour', hour);
    let min = Number(data[2].slice(3, 5));
    console.log('Min: ', min);
    let eventdate = new Date(year, month-1, day, hour, min);
    // alert(year, month, day, hour, min);
    let event = new CalendarEvent(title, content, tag, eventdate);
    
    //now add to the data structure
    eventFlow.push(event);
    eventFlow.sort(function(a, b){return a.notifyTime - b.notifyTime});

    let monthID = String(year) + "@" + String(month);
    // alert(monthID); OK
    if (monthData.hasOwnProperty(monthID)) {
        monthData[monthID].push(event);
        monthData[monthID].sort(function(a, b){return a.notifyTime - b.notifyTime});
    }
    else {
        monthData[monthID] = [];
        monthData[monthID].push(event);
    }

    let dayID = String(year) + "@" + String(month) + '@' + String(day);
    // alert(monthID); OK
    if (dayData.hasOwnProperty(dayID)) {
        dayData[dayID].push(event);
        dayData[dayID].sort(function(a, b){return a.notifyTime - b.notifyTime});
    }
    else {
        dayData[dayID] = [];
        dayData[dayID].push(event);
    }

    let tagID = tag;
    // alert(monthID); OK
    if (tagData.hasOwnProperty(tagID)) {
        tagData[tagID].push(event);
        tagData[tagID].sort(function(a, b){return a.notifyTime - b.notifyTime});
    }
    else {
        tagData[tagID] = [];
        tagData[tagID].push(event);
    }
    // alert(dayData);
    // console.log(dayData);
    // let nextEvent = eventFlow[0];
    // let now = new Date();
    // let timeUntilNotify = (nextEvent.getNotifyTime() - now)/1000; //convert to sec
    // alert(now);
    // alert(nextEvent.getNotifyTime());
    // alert(timeUntilNotify);
    console.log('eventFlow: ', eventFlow);
    onClose(); //close the input box
    run();
}

/**The main process 
 * will check the next event and set reminder
*/
function run() {
    while (true) {
        if (eventFlow.length === 0) {
            updateEventFlow();
            break;
        }
        let now = new Date();
        nextEvent = eventFlow[0];
        let timeUntilNotify = (nextEvent.getNotifyTime() - now); 
        if (timeUntilNotify < 0) { //if the next event is passed -> pop that and move to next one
            eventFlow.shift();
        }
        else {
            //need delete old timeout
            clearTimeout(timeoutID);
            timeoutID = setTimeout(notifyEvent, timeUntilNotify);
            // alert(timeUntilNotify);
            updateEventFlow();
            break;
        }
    }
}
//run();