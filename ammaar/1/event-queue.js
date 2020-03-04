var MAX_TIME = 120;
var MAX_QL = 5;
var CRITICAL_ACTIONS = ["click_contact"];
var CLIENT_INFO_FIELDS = ["bandwidth_kbps", "client_type", "device_id", "device_language", "divar_country", "divar_version",
                          "email", "internet_connection_type", "ios_notification_token", "ip", "isp", "lat", "lng",
                          "mobile_device_brand", "mobile_device_model", "mobile_operator", "os_type", "os_version", "phone_number", "play_services_version", "android_notification_token", "user_agent"]
var client_info = {};

var SUBMIT_PROTOCOL = 'http';
var QUEUE_NAME = 'event_queue';
var queue = [];
var STAT_ENDPOINT = 'https://sc.divar.ir/log';

function load_from_local_storage() {
    queue = JSON.parse(localStorage.getItem(QUEUE_NAME));
    if(queue == null){
        queue = [];
    }
};

function reload() {
    location.reload();
};

function get_abs_time() {
    return new Date().getTime()
}

function submit_js_event(event_object) {
  if(event_object["device_current_millis"] == undefined) {
    event_object['created_at'] = get_abs_time();
  } else {
    event_object['created_at'] = event_object["device_current_millis"];
  }

  CLIENT_INFO_FIELDS.forEach(function(field) {
    if(event_object.hasOwnProperty(field)){
      client_info[field] = event_object[field];
      delete event_object[field];
    }
  });

  action_keys = Object.keys(event_object);

  action_name = action_keys.filter(function(fieldName) {
    return fieldName.indexOf("action_") == 0 && event_object[fieldName]==true;
  })[0];

  if(action_name == undefined) {
    action_name = "action_undefined";
    event_object[action_name] = true;
    action_keys = Object.keys(event_object);
  }

  if(action_name == "action_load_image" && client_info["divar_version"] < "9.2") {
    return ;
  }

  event_object["action"] = action_name.substr("action_".length);

  queue.push(event_object);
  localStorage.setItem(QUEUE_NAME, JSON.stringify(queue));

  if(queue.length >= MAX_QL || CRITICAL_ACTIONS.indexOf(event_object['action']) != -1)
    flush_events();
}
window.submit_js_event = submit_js_event;

function submit_event(event_json) {
  var payload = event_json.replace(/"({"[^}]+})"/g, function(match, toBeReplaced) {
    return toBeReplaced
  })
  
  payload = JSON.parse(payload);
  submit_js_event(payload);
 };

function flush_events() {
    if(queue.length == 0)
        return;
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("POST", STAT_ENDPOINT, true); // false for synchronous request
    var data = JSON.stringify(queue);
    xmlHttp.setRequestHeader('Content-type', 'application/json');
    // TODO: retry
    try {
      xmlHttp.send(JSON.stringify({'logs': queue, 'client_info': client_info}));
    } catch(exception) {
      if(exception.name == 'NetworkError')
        console.log('Network error while sending logs');
      else
        console.log('Unknown error while sending logs');
    }
    queue = []
    localStorage.setItem(QUEUE_NAME, JSON.stringify(queue));
};

if(window.localStorage) {
  load_from_local_storage();
  setInterval(flush_events, MAX_TIME * 1000);
}
